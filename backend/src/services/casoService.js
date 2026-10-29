const { Op } = require("sequelize");
const { CasoSoporte, Reserva, Usuario, Prestador, SitioTuristico, Paquete } = require("../models");
const { ErrorHttp } = require("../utils/errores");
const politicas = require("../politicas");
const { notificar, notificarVarios } = require("./notificacionService");
const auditoria = require("./auditoriaService");
const { CASOS_POR_DIA } = require("../config/soporte");

// Atención al cliente: la turista o el negocio de una reserva reporta un problema; la administración lo revisa y responde.

const INCLUDE_RESERVA = [
  { model: SitioTuristico, as: "sitio", attributes: ["id", "nombre"] },
  { model: Paquete, as: "paquete", attributes: ["id", "nombre"] },
  { model: Prestador, as: "prestador", attributes: ["id", "usuario_id", "nombre_negocio"] },
];
const nombreServicio = (reserva) => reserva?.paquete?.nombre || reserva?.sitio?.nombre || "la reserva";

// Lo que ve quien abrió el caso (y la base de lo que ve la administración).
const presentar = (caso) => ({
  id: caso.id,
  reserva_id: caso.reserva_id,
  codigo: caso.reserva?.codigo || null,
  servicio: nombreServicio(caso.reserva),
  fecha_servicio: caso.reserva?.fecha_servicio || null,
  motivo: caso.motivo,
  detalle: caso.detalle,
  estado: caso.estado,
  respuesta: caso.respuesta,
  creado_en: caso.creado_en,
  actualizado_en: caso.actualizado_en,
  resuelto_en: caso.resuelto_en,
});

async function abrir({ usuario, reserva_id, motivo, detalle }) {
  const reserva = await Reserva.findByPk(reserva_id, { include: INCLUDE_RESERVA });
  // Quien no es parte de la reserva no sabe que existe.
  if (!politicas.reservas.esParteDeLaReserva(usuario, reserva)) throw new ErrorHttp(404, "Reserva no encontrada.");

  const abierto = await CasoSoporte.findOne({ where: { reserva_id, abierto_por: usuario.id, estado: { [Op.ne]: "resuelto" } } });
  if (abierto) throw new ErrorHttp(400, "Ya tienes un caso abierto sobre esta reserva. Puedes seguirlo en «Mis casos de soporte».");
  const hoy = await CasoSoporte.count({ where: { abierto_por: usuario.id, creado_en: { [Op.gte]: new Date(Date.now() - 24 * 3600 * 1000) } } });
  if (hoy >= CASOS_POR_DIA) throw new ErrorHttp(429, "Abriste muchos casos en las últimas 24 horas. Si es urgente, escribe en uno de los que ya tienes abiertos.");

  const caso = await CasoSoporte.create({ reserva_id, abierto_por: usuario.id, motivo, detalle });
  caso.reserva = reserva;

  const admins = await Usuario.findAll({ where: { rol: "administrador", activo: true }, attributes: ["id"] });
  await notificarVarios(admins.map((a) => a.id), "caso_soporte", `Nuevo caso de soporte sobre ${nombreServicio(reserva)} (${motivo.replace(/_/g, " ")}). Revísalo en «Casos de soporte».`);
  return presentar(caso);
}

async function listarMios(usuario) {
  const casos = await CasoSoporte.findAll({
    where: { abierto_por: usuario.id },
    include: [{ model: Reserva, as: "reserva", include: INCLUDE_RESERVA }],
    order: [["creado_en", "DESC"]],
    limit: 100,
  });
  return casos.map(presentar);
}

// Para la administración: los casos de un estado, los más antiguos primero (se atienden en orden de llegada).
async function listar({ estado = "abierto" } = {}) {
  const casos = await CasoSoporte.findAll({
    where: { estado },
    include: [
      { model: Usuario, as: "autor", attributes: ["id", "nombre", "rol"] },
      { model: Reserva, as: "reserva", include: [...INCLUDE_RESERVA, { model: Usuario, as: "turista", attributes: ["id", "nombre"] }] },
    ],
    order: [["creado_en", estado === "resuelto" ? "DESC" : "ASC"]],
    limit: 200,
  });
  return casos.map((c) => ({
    ...presentar(c),
    abierto_por: c.autor ? { nombre: c.autor.nombre, rol: c.autor.rol } : null,
    turista: c.reserva?.turista?.nombre || null,
    negocio: c.reserva?.prestador?.nombre_negocio || null,
    estado_reserva: c.reserva?.estado || null,
  }));
}

async function atender({ id, estado, respuesta, admin_id }) {
  const caso = await CasoSoporte.findByPk(id, { include: [{ model: Reserva, as: "reserva", include: INCLUDE_RESERVA }] });
  if (!caso) throw new ErrorHttp(404, "Caso no encontrado.");
  if (caso.estado === "resuelto") throw new ErrorHttp(400, "Este caso ya está resuelto.");

  const ahora = new Date();
  await caso.update({
    estado,
    respuesta: respuesta || caso.respuesta,
    atendido_por: admin_id,
    actualizado_en: ahora,
    resuelto_en: estado === "resuelto" ? ahora : null,
  });
  await auditoria.registrar({
    actor_id: admin_id, accion: estado === "resuelto" ? "caso_resuelto" : "caso_en_revision", entidad: "caso", entidad_id: caso.id, detalle: `Motivo: ${caso.motivo}`,
  });

  const servicio = nombreServicio(caso.reserva);
  const aviso = estado === "resuelto"
    ? `Tu caso sobre ${servicio} fue resuelto: ${caso.respuesta}`
    : `Tu caso sobre ${servicio} está en revisión.${respuesta ? ` ${respuesta}` : ""}`;
  await notificar(caso.abierto_por, "caso_soporte", aviso);
  return presentar(caso);
}

// Datos personales: los casos de una persona (para su exportación) y su borrado al eliminar la cuenta.
const exportarCasos = (usuario_id) => listarMios({ id: usuario_id });
const eliminarCasosDe = (usuario_id, transaction) => CasoSoporte.destroy({ where: { abierto_por: usuario_id }, transaction });

module.exports = { abrir, listarMios, listar, atender, exportarCasos, eliminarCasosDe };
