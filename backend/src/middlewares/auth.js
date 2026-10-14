const jwt = require("jsonwebtoken");
const { Usuario } = require("../models");
const { leerCookie, esClienteWeb, METODOS_SEGUROS } = require("../utils/sesion");

// Verifica el token y confirma contra la base de datos que la cuenta siga existiendo y activa;
// el rol se toma de la base de datos para que un cambio o una suspensión apliquen de inmediato.
// El token llega por la cabecera Bearer (clientes de API) o por la cookie HttpOnly (la aplicación web).
async function requireAuth(req, res, next) {
  const header = req.headers.authorization;
  const conBearer = Boolean(header && header.startsWith("Bearer "));
  const token = conBearer ? header.slice("Bearer ".length) : leerCookie(req);
  if (!token) return res.status(401).json({ error: "No autenticado. Inicia sesión." });
  // CSRF: la cookie la manda el navegador solo; si la petición cambia datos debe traer la cabecera que solo nuestra aplicación pone.
  if (!conBearer && !METODOS_SEGUROS.has(req.method) && !esClienteWeb(req)) {
    return res.status(403).json({ error: "Petición no permitida: falta la cabecera de la aplicación." });
  }
  let payload;
  try {
    payload = jwt.verify(token, process.env.JWT_SECRET);
  } catch {
    return res.status(401).json({ error: "Token inválido o expirado." });
  }

  try {
    const usuario = await Usuario.findByPk(payload.id, { attributes: ["id", "correo", "rol", "activo", "correo_verificado", "token_version"] });
    if (!usuario) return res.status(401).json({ error: "La cuenta ya no existe." });
    // Los tokens emitidos antes de existir la versión de sesión no la traen: valen como versión 0.
    if ((payload.v ?? 0) !== usuario.token_version) return res.status(401).json({ error: "Tu sesión ya no es válida. Inicia sesión de nuevo." });
    if (!usuario.activo) return res.status(403).json({ error: "Tu cuenta está suspendida. Contacta al administrador." });
    req.usuario = { id: usuario.id, correo: usuario.correo, rol: usuario.rol, correo_verificado: usuario.correo_verificado };
    next();
  } catch (err) {
    next(err);
  }
}

// RF-16 / RN-08: restringe funcionalidades según el rol autenticado.
function requireRole(...rolesPermitidos) {
  const middleware = (req, res, next) => {
    if (!req.usuario || !rolesPermitidos.includes(req.usuario.rol)) {
      return res.status(403).json({ error: "No tiene permisos para esta acción." });
    }
    next();
  };
  middleware.rolesPermitidos = rolesPermitidos; // solo para que las pruebas puedan leer la matriz de permisos real (tests/inventario-rutas.js)
  return middleware;
}

// Acciones que comprometen a otras personas (reservar, enviar un negocio a revisión, calificar) exigen un correo real.
function requireCorreoVerificado(req, res, next) {
  if (req.usuario.rol !== "administrador" && !req.usuario.correo_verificado) {
    return res.status(403).json({
      error: "Verifica tu correo para continuar. Te enviamos un código de 6 dígitos cuando te registraste.",
      codigo: "CORREO_NO_VERIFICADO",
    });
  }
  next();
}

// Etiquetas que solo leen las pruebas para construir la matriz de permisos real (tests/inventario-rutas.js): express-async-errors
// envuelve cada manejador, así que no se puede reconocer un middleware por su identidad, pero sí por estas propiedades.
requireAuth.exigeSesion = true;
requireCorreoVerificado.exigeCorreo = true;

module.exports = { requireAuth, requireRole, requireCorreoVerificado };
