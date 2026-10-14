// POLÍTICAS DE AUTORIZACIÓN: el único lugar donde se decide quién puede hacer qué con cada recurso.
//
//   politicas.catalogo       servicios y paquetes (solo el negocio dueño los gestiona; el administrador modera)
//   politicas.reservas       ver, gestionar, cancelar y reservar
//   politicas.itinerarios    ver y compartir
//   politicas.notificaciones · politicas.negocios (perfil y reseñas) · politicas.cuentas
//   politicas.mensajes       conversaciones: solo sus dos partes; el negocio solo responde
//
// Las rutas ya filtran por ROL y por sesión (middlewares/auth.js: requireRole); estas políticas deciden la PROPIEDAD del recurso
// ("¿es tuyo?"). La matriz de rutas está en tests/matriz-permisos.js y las políticas, una por una, en tests/politicas.test.js.
module.exports = {
  catalogo: require("./catalogo"),
  reservas: require("./reservas"),
  itinerarios: require("./itinerarios"),
  notificaciones: require("./notificaciones"),
  negocios: require("./negocios"),
  cuentas: require("./cuentas"),
  mensajes: require("./mensajes"),
};
