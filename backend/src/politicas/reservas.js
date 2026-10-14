const { esAdministrador, exigir } = require("./comun");

// Reservas (RN-07). Dos personas intervienen: la turista que reserva y el negocio dueño del servicio.
// `reserva.prestador` es el negocio de la reserva (con su usuario_id) y `negocio` un perfil de prestador, ya cargados por el servicio.

// ¿Puede esta persona ver la reserva? La turista dueña, el negocio dueño o la administración.
const puedeVerReserva = (usuario, reserva) =>
  reserva.turista_id === usuario.id || reserva.prestador?.usuario_id === usuario.id || esAdministrador(usuario);

// ¿Puede esta cuenta de prestador gestionar (confirmar, rechazar, registrar asistencia) las reservas de ese negocio?
const puedeGestionarReserva = (usuario_id, negocio) => Boolean(negocio) && negocio.usuario_id === usuario_id;
const exigirGestionarReserva = (usuario_id, negocio) =>
  exigir(puedeGestionarReserva(usuario_id, negocio), 400, "No puede gestionar una reserva que no pertenece a su negocio.");

// ¿Es esta persona la turista de la reserva? Solo ella la cancela, la modifica o la califica. Si no lo es, la reserva "no existe" para ella.
const esTuristaDeLaReserva = (turista_id, reserva) => Boolean(reserva) && reserva.turista_id === turista_id;
const exigirTuristaDeLaReserva = (turista_id, reserva) => exigir(esTuristaDeLaReserva(turista_id, reserva), 400, "Reserva no encontrada."); // RN-07

// Reservar el servicio de tu propio negocio no está permitido.
const esAutoReserva = (turista_id, negocio) => Boolean(negocio) && negocio.usuario_id === turista_id;
const exigirNoEsAutoReserva = (turista_id, negocio) =>
  exigir(!esAutoReserva(turista_id, negocio), 400, "No puedes reservar un servicio de tu propio negocio.");

module.exports = {
  puedeVerReserva, puedeGestionarReserva, exigirGestionarReserva, esTuristaDeLaReserva, exigirTuristaDeLaReserva, esAutoReserva, exigirNoEsAutoReserva,
};
