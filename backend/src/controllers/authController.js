const authService = require("../services/authService");
const { respuestaConSesion, iniciarSesionEnCookie, cerrarSesionEnCookie, esClienteWeb } = require("../utils/sesion");

const { datosUsuario, firmarToken } = authService;

// Los datos de entrada ya llegan validados (middlewares/validate + validators/schemas). Aquí solo se decide cómo entregar el
// resultado: la sesión viaja en una cookie HttpOnly (ver utils/sesion.js) y las reglas viven en services/authService.js.

// RF-01: registro de turistas y prestadores.
async function registro(req, res) {
  const { usuario, prestador } = await authService.registrar(req.body);
  return respuestaConSesion(req, res, firmarToken(usuario), { usuario: datosUsuario(usuario), ...(prestador ? { prestador } : {}) }, 201);
}

// RF-01: inicio de sesión.
async function login(req, res) {
  const usuario = await authService.iniciarSesion(req.body);
  return respuestaConSesion(req, res, firmarToken(usuario), { usuario: datosUsuario(usuario) });
}

// RF-01 / RF-16: perfil del usuario autenticado.
const me = async (req, res) => res.json(await authService.perfil(req.usuario.id));

// RF-01: recuperación de contraseña (la respuesta es la misma exista o no la cuenta).
const solicitarRecuperacion = async (req, res) => res.json(await authService.solicitarRecuperacion(req.body.correo));

async function restablecerContrasena(req, res) {
  await authService.restablecerContrasena(req.body);
  return res.json({ mensaje: "Contraseña actualizada correctamente. Ya puedes iniciar sesión." });
}

// El usuario autenticado edita su nombre y correo.
const actualizarPerfil = async (req, res) => res.json(datosUsuario(await authService.actualizarPerfil(req.usuario.id, req.body)));

async function verificarCorreo(req, res) {
  await authService.verificarCorreo(req.usuario.id, req.body.codigo);
  return res.json({ mensaje: "Correo verificado correctamente.", correo_verificado: true });
}

async function reenviarVerificacion(req, res) {
  await authService.reenviarVerificacion(req.usuario.id);
  return res.json({ mensaje: "Te enviamos un código nuevo." });
}

// Cambio de contraseña estando logueado. La cookie se renueva con la versión nueva de sesión; la aplicación web no necesita
// ver el token, los clientes de API sí lo reciben.
async function cambiarPassword(req, res) {
  const usuario = await authService.cambiarPassword(req.usuario.id, req.body);
  const token = firmarToken(usuario);
  iniciarSesionEnCookie(req, res, token);
  const mensaje = "Contraseña actualizada correctamente.";
  return res.json(esClienteWeb(req) ? { mensaje } : { mensaje, token });
}

// Cierra la sesión del navegador: la cookie es HttpOnly, así que solo el servidor puede borrarla.
function logout(req, res) {
  cerrarSesionEnCookie(req, res);
  return res.json({ mensaje: "Sesión cerrada." });
}

module.exports = { logout, verificarCorreo, reenviarVerificacion, actualizarPerfil, cambiarPassword, registro, login, me, solicitarRecuperacion, restablecerContrasena };
