const jwt = require("jsonwebtoken");

// La sesión del navegador viaja en una cookie HttpOnly: ningún script de la página puede leerla (un XSS ya no se lleva el token).
// Como el navegador la envía sola, las peticiones que cambian datos exigen además una cabecera propia que un sitio ajeno no puede
// poner sin un permiso previo de CORS (defensa contra CSRF, junto con SameSite=Lax).
const NOMBRE_COOKIE = "publitours_sesion";
const CABECERA_CLIENTE = "x-requested-with";
const VALOR_CABECERA = "PubliTours";
const METODOS_SEGUROS = new Set(["GET", "HEAD", "OPTIONS"]);

function leerCookie(req, nombre = NOMBRE_COOKIE) {
  const cabecera = req.headers.cookie;
  if (!cabecera) return null;
  for (const par of cabecera.split(";")) {
    const i = par.indexOf("=");
    if (i < 0 || par.slice(0, i).trim() !== nombre) continue;
    try { return decodeURIComponent(par.slice(i + 1).trim()) || null; } catch { return null; }
  }
  return null;
}

// Misma vigencia que el token (su campo exp).
function opcionesCookie(req, token) {
  const exp = jwt.decode(token)?.exp;
  const opciones = { httpOnly: true, sameSite: "lax", path: "/", secure: Boolean(req.secure) };
  if (exp) opciones.maxAge = Math.max(0, exp * 1000 - Date.now());
  return opciones;
}

const iniciarSesionEnCookie = (req, res, token) => res.cookie(NOMBRE_COOKIE, token, opcionesCookie(req, token));
const cerrarSesionEnCookie = (req, res) => res.clearCookie(NOMBRE_COOKIE, { httpOnly: true, sameSite: "lax", path: "/", secure: Boolean(req.secure) });

// ¿La petición la hizo la aplicación web? (manda la cabecera propia)
const esClienteWeb = (req) => req.get(CABECERA_CLIENTE) === VALOR_CABECERA;

// Respuesta de login/registro: la aplicación web recibe solo la cookie; los clientes de API (sin la cabecera) reciben además el token.
function respuestaConSesion(req, res, token, cuerpo, estado = 200) {
  iniciarSesionEnCookie(req, res, token);
  return res.status(estado).json(esClienteWeb(req) ? cuerpo : { token, ...cuerpo });
}

module.exports = {
  NOMBRE_COOKIE, VALOR_CABECERA, METODOS_SEGUROS,
  leerCookie, esClienteWeb, iniciarSesionEnCookie, cerrarSesionEnCookie, respuestaConSesion,
};
