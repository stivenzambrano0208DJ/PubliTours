// Lo que pasa alrededor del servicio: recordatorio previo, registro de asistencia y cierre automático (tareas programadas).
const { Op } = require("sequelize");
const { DIAS_GRACIA_ASISTENCIA, DIAS_RECORDAR_RESENA, VENTANA_RECORDATORIO_RESENA } = require("../../config/negocio");
const { sequelize, Reserva, Prestador, Usuario, Resena } = require("../../models");
const { notificar } = require("../notificacionService");
const { INCLUDE_RESERVA, etiqueta, exigirPrestadorDeReserva } = require("./comun");
const { hoyLocal, fechaRelativa } = require("../../utils/fechas");
const { ErrorHttp } = require("../../utils/errores");

const mensajeCompletada = (r) => (r.paquete
  ? `¿Cómo estuvo ${etiqueta(r)}? Esperamos que lo hayas disfrutado.`
  : `¿Cómo estuvo ${etiqueta(r)}? Cuéntanos tu experiencia con una calificación.`);

// Recordatorio por correo y notificación un día antes del servicio (una sola vez por reserva).
async function enviarRecordatorios({ diasAntes = 1 } = {}) {
  const fecha = fechaRelativa(diasAntes);
  const reservas = await Reserva.findAll({
    where: { estado: "confirmada", fecha_servicio: fecha, recordatorio_enviado_en: null },
    include: INCLUDE_RESERVA,
  });
  let enviados = 0;
  for (const r of reservas) {
    // Se "reclama" con un UPDATE condicional: si otro proceso ya lo envió (dos instancias o dos ejecuciones a la vez), no se repite.
    const [reclamada] = await Reserva.update({ recordatorio_enviado_en: new Date() }, { where: { id: r.id, recordatorio_enviado_en: null } });
    if (reclamada === 0) continue;
    enviados += 1;
    await notificar(
      r.turista_id,
      "reserva_recordatorio",
      `Mañana tienes ${etiqueta(r)} (${r.personas} persona${r.personas === 1 ? "" : "s"}). Presenta tu código de comprobante: ${r.codigo}.`
    );
  }
  return enviados;
}

// Recordatorio para calificar: si la turista no dejó reseña unos días después del servicio, se le recuerda UNA sola vez.
// Solo para servicios de las últimas semanas: al activar esta función nadie recibe recordatorios de viajes de hace meses.
async function recordarCalificar() {
  const reservas = await Reserva.findAll({
    where: {
      estado: "completada",
      recordatorio_resena_en: null,
      fecha_servicio: { [Op.between]: [fechaRelativa(-VENTANA_RECORDATORIO_RESENA), fechaRelativa(-DIAS_RECORDAR_RESENA)] },
    },
    include: [...INCLUDE_RESERVA, { model: Resena, as: "resena", attributes: ["id"], required: false }],
  });
  let enviados = 0;
  for (const r of reservas) {
    if (r.resena) continue; // ya calificó
    const [reclamada] = await Reserva.update({ recordatorio_resena_en: new Date() }, { where: { id: r.id, recordatorio_resena_en: null } });
    if (reclamada === 0) continue; // otro proceso ya lo envió
    enviados += 1;
    await notificar(r.turista_id, "resena_recordatorio", `¿Cómo te fue en ${etiqueta(r)} el ${r.fecha_servicio}? Tu calificación ayuda a otros viajeros a elegir y a los negocios del Caquetá a mejorar.`);
  }
  return enviados;
}

// Cierre de las reservas cuyo servicio ya pasó. La asistencia la registra el prestador (registrarAsistencia); aquí solo:
//  1) si pasó el plazo de gracia sin que la registrara, la reserva se completa sola (marcada como cierre automático);
//  2) a las demás, desde el día siguiente, se le recuerda una sola vez al prestador que la registre.
// Devuelve cuántas reservas se completaron solas.
async function cerrarReservasVencidas() {
  const conTurista = [...INCLUDE_RESERVA, { model: Usuario, as: "turista", attributes: ["id", "nombre"] }, { model: Prestador, as: "prestador", attributes: ["usuario_id"] }];

  const vencidas = await Reserva.findAll({
    where: { estado: "confirmada", fecha_servicio: { [Op.lte]: fechaRelativa(-DIAS_GRACIA_ASISTENCIA) } },
    include: INCLUDE_RESERVA,
  });
  let cerradas = 0;
  for (const r of vencidas) {
    // Solo si sigue confirmada: el prestador pudo registrar la asistencia mientras tanto.
    const [cambiadas] = await Reserva.update({ estado: "completada", cierre_automatico: true }, { where: { id: r.id, estado: "confirmada" } });
    if (cambiadas === 0) continue;
    cerradas += 1;
    await notificar(r.turista_id, "reserva_completada", mensajeCompletada(r));
  }

  const porAvisar = await Reserva.findAll({
    where: { estado: "confirmada", fecha_servicio: { [Op.lt]: hoyLocal() }, aviso_cierre_en: null },
    include: conTurista,
  });
  for (const r of porAvisar) {
    const [reclamada] = await Reserva.update({ aviso_cierre_en: new Date() }, { where: { id: r.id, aviso_cierre_en: null } });
    if (reclamada === 0) continue; // otro proceso ya lo avisó
    await notificar(
      r.prestador.usuario_id,
      "asistencia_pendiente",
      `Registra si ${r.turista?.nombre || "el turista"} asistió a ${etiqueta(r)} (${r.fecha_servicio}). Si no lo haces en los próximos días, la reserva se cerrará sola como completada.`
    );
  }
  return cerradas;
}

// El prestador registra si el turista asistió, desde el día del servicio. Es definitivo y solo aplica a reservas confirmadas.
//  - Asistió → completada: cuenta como ingreso y el turista puede calificar.
//  - No asistió → no_asistio: no cuenta como ingreso, no genera comisión ni permite reseña.
async function registrarAsistencia({ reservaId, usuarioPrestadorId, asistio }) {
  const reserva = await sequelize.transaction(async (transaction) => {
    const base = await Reserva.findByPk(reservaId, { transaction, lock: transaction.LOCK.UPDATE });
    if (!base) throw new ErrorHttp(400, "Reserva no encontrada.");
    await exigirPrestadorDeReserva(base, usuarioPrestadorId, transaction);
    if (base.estado !== "confirmada") throw new ErrorHttp(400, "Solo se puede registrar la asistencia de una reserva confirmada.");
    if (base.fecha_servicio > hoyLocal()) throw new ErrorHttp(400, "Podrás registrar la asistencia desde el día del servicio.");

    // Sin comisión si no asistió: nunca se prestó el servicio.
    await base.update(asistio ? { estado: "completada" } : { estado: "no_asistio", comision_pct: null, comision: null }, { transaction });
    return Reserva.findByPk(reservaId, { include: INCLUDE_RESERVA, transaction });
  });

  if (asistio) await notificar(reserva.turista_id, "reserva_completada", mensajeCompletada(reserva));
  else {
    await notificar(
      reserva.turista_id,
      "reserva_no_asistio",
      `El prestador registró que no asististe a ${etiqueta(reserva)} el ${reserva.fecha_servicio}. Si crees que es un error, comunícate con el negocio.`
    );
  }
  return reserva;
}

module.exports = { enviarRecordatorios, recordarCalificar, cerrarReservasVencidas, registrarAsistencia };
