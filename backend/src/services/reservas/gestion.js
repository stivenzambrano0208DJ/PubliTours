// Ciclo de vida de una reserva antes del servicio: solicitar, confirmar, rechazar, cancelar y modificar.
const { cotizar } = require("../precioService");
const { comisionPorcentaje, calcularComision, esCancelacionTardia } = require("../../config/negocio");
const { sequelize, Reserva, SitioTuristico, Prestador, Paquete, PaqueteItem } = require("../../models");
const { notificar } = require("../notificacionService");
const { ErrorHttp } = require("../../utils/errores");
const politicas = require("../../politicas");
const { prestadorOperativo } = require("../visibilidad");
const {
  hoyLocal, INCLUDE_RESERVA, etiqueta, exigirPrestadorDeReserva, validarFechaNoBloqueada, validarCupo, validarFechaYPersonas,
} = require("./comun");

// RF-11: el turista solicita una reserva sobre un servicio o un paquete.
async function solicitarReserva({ turista_id, sitio_id, paquete_id, fecha_servicio, personas = 1, ninos = 0, nota = null }) {
  let sitio = null;
  let paquete = null;
  let prestador;
  let sitioIds;
  let nombre;
  let precio;
  let capacidad;
  let politica;

  if (paquete_id) {
    paquete = await Paquete.findByPk(paquete_id, { include: [{ model: PaqueteItem, as: "items", include: [{ model: SitioTuristico, as: "sitio" }] }], order: [[{ model: PaqueteItem, as: "items" }, "orden", "ASC"]] });
    if (!paquete || paquete.estado !== "activo") throw new ErrorHttp(400, "El paquete no está disponible para reservas.");
    const inactivo = paquete.items.find((i) => i.sitio.estado !== "activo");
    if (inactivo) throw new ErrorHttp(400, `El paquete no está disponible: "${inactivo.sitio.nombre}" ya no está activo.`);
    prestador = await Prestador.findByPk(paquete.prestador_id);
    sitioIds = paquete.items.map((i) => i.sitio_id);
    nombre = `el paquete "${paquete.nombre}"`;
    precio = Number(paquete.precio);
    capacidad = paquete.capacidad;
    politica = paquete.politica_cancelacion;
  } else {
    sitio = await SitioTuristico.findByPk(sitio_id);
    if (!sitio) throw new ErrorHttp(400, "Sitio no encontrado.");
    if (sitio.estado !== "activo") throw new ErrorHttp(400, "El sitio no está disponible para reservas.");
    if (!sitio.prestador_id) throw new ErrorHttp(400, "Este sitio no tiene un prestador asociado y no admite reservas.");
    prestador = await Prestador.findByPk(sitio.prestador_id);
    sitioIds = [sitio.id];
    nombre = `"${sitio.nombre}"`;
    precio = Number(sitio.precio);
    capacidad = sitio.capacidad;
    politica = sitio.politica_cancelacion;
  }

  if (!prestador || prestador.estado_verificacion !== "aprobado") {
    throw new ErrorHttp(400, "El prestador no está verificado."); // RN-01
  }
  if (!(await prestadorOperativo(prestador.id))) throw new ErrorHttp(400, "Este prestador no está disponible por el momento.");
  politicas.reservas.exigirNoEsAutoReserva(turista_id, prestador);
  validarFechaYPersonas(fecha_servicio, personas, capacidad, paquete ? "Este paquete" : "Este servicio");
  await validarFechaNoBloqueada(sitioIds, fecha_servicio);

  // El total sale de las tarifas del servicio (temporada, niños, descuento por grupo); un paquete cobra su precio por persona.
  const total = paquete ? precio * personas : (await cotizar(sitio, { fecha: fecha_servicio, personas, ninos })).total;

  // RN-04: toda solicitud nace en estado "pendiente".
  const reserva = await Reserva.create({
    turista_id, sitio_id: sitioIds[0], paquete_id: paquete ? paquete.id : null, prestador_id: prestador.id,
    fecha_servicio, estado: "pendiente", personas, ninos: paquete ? 0 : ninos, nota, total,
    politica_cancelacion: politica, // la que se le mostró al turista: si el prestador la cambia después, esta reserva conserva la suya
  });

  // RF-12: notificar al prestador de la nueva solicitud.
  await notificar(
    prestador.usuario_id,
    "nueva_reserva",
    `Tienes una nueva solicitud de reserva para ${nombre} el ${fecha_servicio} (${personas} persona${personas === 1 ? "" : "s"}).`
  );
  await notificar(
    turista_id,
    "reserva_solicitada",
    `Recibimos tu solicitud para ${nombre} el ${fecha_servicio}. El prestador la revisará y te avisaremos.`
  );

  return reserva;
}

// RF-13/RN-03: el prestador confirma una reserva solo si hay disponibilidad para esa fecha.
// La revisión de cupo y la confirmación van en una transacción que bloquea la fila de lo reservado (servicio o paquete):
// si dos confirmaciones llegan a la vez, la segunda espera a la primera y ya ve el cupo ocupado (sin sobreventa).
async function confirmarReserva({ reservaId, usuarioPrestadorId }) {
  const reserva = await sequelize.transaction(async (transaction) => {
    const base = await Reserva.findByPk(reservaId, { transaction, lock: transaction.LOCK.UPDATE });
    if (!base) throw new ErrorHttp(400, "Reserva no encontrada.");

    await exigirPrestadorDeReserva(base, usuarioPrestadorId, transaction);
    if (base.estado !== "pendiente") {
      throw new ErrorHttp(400, "Solo se pueden confirmar reservas en estado pendiente.");
    }

    // Serializa las confirmaciones sobre el mismo servicio o paquete.
    if (base.paquete_id) await Paquete.findByPk(base.paquete_id, { transaction, lock: transaction.LOCK.UPDATE });
    else await SitioTuristico.findByPk(base.sitio_id, { transaction, lock: transaction.LOCK.UPDATE });

    const completa = await Reserva.findByPk(reservaId, { include: INCLUDE_RESERVA, transaction });
    const sitioIds = completa.paquete ? completa.paquete.items.map((i) => i.sitio_id) : [completa.sitio_id];
    await validarFechaNoBloqueada(sitioIds, completa.fecha_servicio);
    await validarCupo(
      completa.paquete
        ? { capacidad: completa.paquete.capacidad, filtro: { paquete_id: completa.paquete_id } }
        : { capacidad: completa.sitio.capacidad, filtro: { sitio_id: completa.sitio_id, paquete_id: null } },
      completa.fecha_servicio, completa.personas, completa.id, transaction
    );

    // La comisión estimada se congela al confirmar: cambiar el porcentaje después no toca lo ya confirmado.
    const comision_pct = comisionPorcentaje();
    await completa.update({ estado: "confirmada", comision_pct, comision: calcularComision(completa.total, comision_pct) }, { transaction });
    return completa;
  });

  await notificar(reserva.turista_id, "reserva_confirmada", `Tu reserva para ${etiqueta(reserva)} el ${reserva.fecha_servicio} fue confirmada.`);
  return reserva;
}

// RF-13: el prestador rechaza una reserva, opcionalmente explicando el motivo al turista.
async function rechazarReserva({ reservaId, usuarioPrestadorId, motivo = null }) {
  const reserva = await Reserva.findByPk(reservaId, { include: INCLUDE_RESERVA });
  if (!reserva) throw new ErrorHttp(400, "Reserva no encontrada.");

  await exigirPrestadorDeReserva(reserva, usuarioPrestadorId);
  if (reserva.estado !== "pendiente") {
    throw new ErrorHttp(400, "Solo se pueden rechazar reservas en estado pendiente.");
  }

  await reserva.update({ estado: "rechazada", motivo_rechazo: motivo || null });
  await notificar(
    reserva.turista_id,
    "reserva_rechazada",
    `Tu reserva para ${etiqueta(reserva)} el ${reserva.fecha_servicio} fue rechazada.${motivo ? ` Motivo: ${motivo}` : ""}`
  );
  return reserva;
}

// El turista cancela su propia reserva (pendiente o confirmada) antes de la fecha del servicio.
async function cancelarReserva({ reservaId, turista_id }) {
  const reserva = await Reserva.findByPk(reservaId, { include: INCLUDE_RESERVA });
  politicas.reservas.exigirTuristaDeLaReserva(turista_id, reserva); // RN-07
  if (reserva.estado !== "pendiente" && reserva.estado !== "confirmada") {
    throw new ErrorHttp(400, "Solo se pueden cancelar reservas pendientes o confirmadas.");
  }
  if (reserva.fecha_servicio <= hoyLocal()) {
    throw new ErrorHttp(400, "Ya no se puede cancelar una reserva cuya fecha es hoy o ya pasó.");
  }

  // Solo una reserva ya confirmada puede ser "tardía": una pendiente nunca comprometió al prestador.
  const tardia = reserva.estado === "confirmada" && esCancelacionTardia(reserva.politica_cancelacion, reserva.fecha_servicio);
  await reserva.update({ estado: "cancelada", cancelacion_tardia: tardia });
  const prestador = await Prestador.findByPk(reserva.prestador_id);
  if (prestador) {
    await notificar(
      prestador.usuario_id,
      "reserva_cancelada",
      `El turista canceló su reserva para ${etiqueta(reserva)} el ${reserva.fecha_servicio}.${tardia ? ` Fue una cancelación tardía: la política de este servicio es "${reserva.politica_cancelacion}".` : ""}`
    );
  }
  return reserva;
}

// El turista cambia la fecha, las personas o la nota de una reserva suya sin cancelar y reservar de nuevo.
// Una reserva confirmada vuelve a "pendiente": el prestador debe aceptar los nuevos datos (y se libera el cupo anterior).
async function editarReserva({ reservaId, turista_id, fecha_servicio, personas, ninos = 0, nota }) {
  const reserva = await Reserva.findByPk(reservaId, { include: INCLUDE_RESERVA });
  politicas.reservas.exigirTuristaDeLaReserva(turista_id, reserva); // RN-07
  if (reserva.estado !== "pendiente" && reserva.estado !== "confirmada") {
    throw new ErrorHttp(400, "Solo se pueden modificar reservas pendientes o confirmadas.");
  }
  if (reserva.fecha_servicio <= hoyLocal()) throw new ErrorHttp(400, "Ya no se puede modificar una reserva cuya fecha es hoy o ya pasó.");

  const esPaquete = Boolean(reserva.paquete);
  const objeto = esPaquete ? reserva.paquete : reserva.sitio;
  const nuevosNinos = esPaquete ? 0 : ninos;
  const nuevaNota = nota === undefined ? reserva.nota : nota || null;

  if (fecha_servicio === reserva.fecha_servicio && personas === reserva.personas && nuevosNinos === reserva.ninos && (nuevaNota || null) === (reserva.nota || null)) {
    throw new ErrorHttp(400, "No hay cambios que guardar.");
  }
  validarFechaYPersonas(fecha_servicio, personas, objeto.capacidad, esPaquete ? "Este paquete" : "Este servicio");
  await validarFechaNoBloqueada(esPaquete ? reserva.paquete.items.map((i) => i.sitio_id) : [reserva.sitio_id], fecha_servicio);

  const total = esPaquete ? Number(reserva.paquete.precio) * personas : (await cotizar(reserva.sitio, { fecha: fecha_servicio, personas, ninos })).total;
  const estabaConfirmada = reserva.estado === "confirmada";
  // Vuelve a pendiente con otro total: la comisión se recalcula cuando el prestador la confirme de nuevo.
  await reserva.update({ fecha_servicio, personas, ninos: nuevosNinos, nota: nuevaNota, total, estado: "pendiente", comision_pct: null, comision: null });

  const prestador = await Prestador.findByPk(reserva.prestador_id);
  if (prestador) {
    await notificar(
      prestador.usuario_id,
      "reserva_modificada",
      `El turista modificó su reserva para ${etiqueta(reserva)}: ahora es el ${fecha_servicio} para ${personas} persona${personas === 1 ? "" : "s"}.${estabaConfirmada ? " Necesita tu nueva confirmación." : ""}`
    );
  }
  return reserva;
}

module.exports = { solicitarReserva, confirmarReserva, rechazarReserva, cancelarReserva, editarReserva };
