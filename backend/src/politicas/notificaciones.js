const { exigir } = require("./comun");

// Notificaciones: solo su destinataria puede marcarlas como leídas.
const puedeModificarNotificacion = (usuario_id, notificacion) => notificacion.usuario_id === usuario_id;
const exigirModificarNotificacion = (usuario_id, notificacion) =>
  exigir(puedeModificarNotificacion(usuario_id, notificacion), 403, "No puede modificar una notificación de otro usuario.");

module.exports = { puedeModificarNotificacion, exigirModificarNotificacion };
