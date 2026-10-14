const reservas = require("../services/reservas");
const { ErrorHttp } = require("../utils/errores");

// Capa HTTP de las reservas. Las reglas viven en services/reservas; los errores los resuelve el manejador central (app.js).

// RF-11: el turista solicita una reserva sobre un servicio o un paquete.
const solicitar = async (req, res) => {
  const { sitio_id, paquete_id, fecha_servicio, personas, ninos, nota } = req.body;
  return res.status(201).json(await reservas.solicitarReserva({ turista_id: req.usuario.id, sitio_id, paquete_id, fecha_servicio, personas, ninos, nota }));
};

const confirmar = async (req, res) => res.json(await reservas.confirmarReserva({ reservaId: req.params.id, usuarioPrestadorId: req.usuario.id }));

const rechazar = async (req, res) =>
  res.json(await reservas.rechazarReserva({ reservaId: req.params.id, usuarioPrestadorId: req.usuario.id, motivo: req.body.motivo }));

const asistencia = async (req, res) =>
  res.json(await reservas.registrarAsistencia({ reservaId: req.params.id, usuarioPrestadorId: req.usuario.id, asistio: req.body.asistio }));

const cancelar = async (req, res) => res.json(await reservas.cancelarReserva({ reservaId: req.params.id, turista_id: req.usuario.id }));

const editar = async (req, res) => res.json(await reservas.editarReserva({ reservaId: req.params.id, turista_id: req.usuario.id, ...req.body }));

async function obtener(req, res) {
  const reserva = await reservas.obtenerReserva(req.params.id, req.usuario);
  if (!reserva) throw new ErrorHttp(404, "Reserva no encontrada.");
  return res.json(reserva);
}

async function verificar(req, res) {
  const datos = await reservas.verificarComprobante(req.params.codigo);
  if (!datos) throw new ErrorHttp(404, "No existe una reserva con ese código.");
  return res.json(datos);
}

const misReservas = async (req, res) => res.json(await reservas.listarReservasTurista(req.usuario.id));

const reservasRecibidas = async (req, res) => res.json(await reservas.listarReservasPrestador(req.usuario.id));

module.exports = { asistencia, solicitar, confirmar, rechazar, cancelar, editar, obtener, verificar, misReservas, reservasRecibidas };
