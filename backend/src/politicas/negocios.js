const { exigir } = require("./comun");

// El perfil del negocio y las reseñas de lo que publica (RN-07). `negocio` es el perfil de prestador ya cargado.

// El prestador solo toca el perfil de su propio negocio. El mensaje cambia según la acción (editar, enviar a revisión…).
const puedeEditarPerfil = (usuario, negocio) => negocio.usuario_id === usuario.id;
const exigirEditarPerfil = (usuario, negocio, mensaje) => exigir(puedeEditarPerfil(usuario, negocio), 403, mensaje);

// Solo el negocio dueño del servicio o paquete reseñado puede responder la reseña.
const puedeResponderResena = (usuario_id, negocio) => Boolean(negocio) && negocio.usuario_id === usuario_id;
const exigirResponderResena = (usuario_id, negocio) =>
  exigir(puedeResponderResena(usuario_id, negocio), 400, "Solo el prestador de este servicio puede responder la reseña.");

module.exports = { puedeEditarPerfil, exigirEditarPerfil, puedeResponderResena, exigirResponderResena };
