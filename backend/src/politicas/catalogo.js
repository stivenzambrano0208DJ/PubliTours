const { esPrestador, exigir } = require("./comun");

// Servicios y paquetes. Regla de producto: el catálogo lo gestiona SOLO el negocio que lo publicó. El administrador verifica negocios y
// modera (ocultar, volver a publicar) por sus propias rutas, pero no crea, edita ni borra servicios.
// `negocio` es el perfil de prestador (Prestador) del servicio o del paquete, ya cargado por el servicio que pregunta.

// ¿Puede esta persona editar (o borrar, o subirle fotos y bloquear fechas) un servicio de ese negocio?
const puedeEditarServicio = (usuario, negocio) => esPrestador(usuario) && Boolean(negocio) && negocio.usuario_id === usuario.id;
const exigirEditarServicio = (usuario, negocio) =>
  exigir(puedeEditarServicio(usuario, negocio), 403, "No puede modificar un sitio que no pertenece a su negocio."); // RN-07

// ¿Puede publicar un servicio a nombre de ese negocio?
const puedePublicarComo = (usuario, negocio) => esPrestador(usuario) && Boolean(negocio) && negocio.usuario_id === usuario.id;
const exigirPublicarComo = (usuario, negocio) => exigir(puedePublicarComo(usuario, negocio), 403, "No puede publicar sitios para otro prestador.");

// ¿Es este servicio de ese negocio? (para armar paquetes solo con servicios propios)
const servicioEsDelNegocio = (sitio, negocio) => Boolean(negocio) && sitio.prestador_id === negocio.id;
const exigirServicioDelNegocio = (sitio, negocio) =>
  exigir(servicioEsDelNegocio(sitio, negocio), 400, "Solo puedes incluir servicios de tu propio negocio.");

// ¿Es este paquete de ese negocio?
const puedeEditarPaquete = (negocio, paquete) => Boolean(negocio) && negocio.id === paquete.prestador_id;
const exigirEditarPaquete = (negocio, paquete) =>
  exigir(puedeEditarPaquete(negocio, paquete), 400, "No puedes modificar un paquete que no es de tu negocio."); // RN-07

module.exports = {
  puedeEditarServicio, exigirEditarServicio, puedePublicarComo, exigirPublicarComo,
  servicioEsDelNegocio, exigirServicioDelNegocio, puedeEditarPaquete, exigirEditarPaquete,
};
