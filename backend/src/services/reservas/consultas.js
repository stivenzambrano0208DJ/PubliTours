// Lecturas de reservas: listados del turista y del prestador, comprobante y verificación pública del código.
const { Reserva, Prestador, Usuario, Resena } = require("../../models");
const { cerrarReservasVencidas } = require("./seguimiento");
const { INCLUDE_RESERVA } = require("./comun");
const { ErrorHttp } = require("../../utils/errores");
const { prestadorDeUsuario } = require("../negocioPropio");
const politicas = require("../../politicas");

// RF-14: el turista consulta sus propias reservas.
async function listarReservasTurista(turista_id) {
  await cerrarReservasVencidas();
  return Reserva.findAll({
    where: { turista_id },
    include: [
      ...INCLUDE_RESERVA,
      { model: Prestador, as: "prestador", attributes: ["id", "nombre_negocio", "municipio"] },
      { model: Resena, as: "resena", attributes: ["id", "calificacion", "comentario", "respuesta"] },
    ],
    order: [["fecha_solicitud", "DESC"]],
  });
}

// RF-12: el prestador consulta las reservas recibidas de su negocio.
async function listarReservasPrestador(usuarioPrestadorId) {
  await cerrarReservasVencidas();
  const prestador = await prestadorDeUsuario(usuarioPrestadorId);
  if (!prestador) throw new ErrorHttp(400, "No tiene un perfil de prestador registrado.");

  return Reserva.findAll({
    where: { prestador_id: prestador.id },
    include: [...INCLUDE_RESERVA, { model: Usuario, as: "turista", attributes: ["id", "nombre"] }],
    order: [["fecha_solicitud", "DESC"]],
  });
}

// Una reserva con sus datos completos, solo para el turista dueño, el prestador del negocio o un administrador (comprobante).
async function obtenerReserva(id, usuario) {
  const reserva = await Reserva.findByPk(id, {
    include: [
      ...INCLUDE_RESERVA,
      { model: Prestador, as: "prestador", attributes: ["id", "usuario_id", "nombre_negocio", "municipio", "telefono", "direccion"] },
      { model: Usuario, as: "turista", attributes: ["id", "nombre"] },
    ],
  });
  if (!reserva) return null;
  if (!politicas.reservas.puedeVerReserva(usuario, reserva)) return null; // RN-07: para quien no es parte, la reserva no existe
  return reserva;
}

// Verificación pública de un comprobante: solo estado y datos mínimos (sin datos de contacto).
async function verificarComprobante(codigo) {
  const reserva = await Reserva.findOne({
    where: { codigo: String(codigo || "").toUpperCase() },
    include: [...INCLUDE_RESERVA, { model: Usuario, as: "turista", attributes: ["nombre"] }],
  });
  if (!reserva) return null;
  const [primerNombre, ...resto] = (reserva.turista?.nombre || "").split(" ");
  return {
    codigo: reserva.codigo,
    estado: reserva.estado,
    fecha_servicio: reserva.fecha_servicio,
    personas: reserva.personas,
    servicio: reserva.paquete ? `Paquete: ${reserva.paquete.nombre}` : reserva.sitio.nombre,
    titular: [primerNombre, resto[0] ? `${resto[0][0]}.` : ""].filter(Boolean).join(" "),
  };
}

module.exports = { listarReservasTurista, listarReservasPrestador, obtenerReserva, verificarComprobante };
