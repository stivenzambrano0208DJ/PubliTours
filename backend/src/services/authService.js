const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const crypto = require("crypto");
const { Op } = require("sequelize");
const { sequelize, Usuario, Prestador, PasswordReset } = require("../models");
const { VERSION_TERMINOS } = require("../config/terminos");
const verificacion = require("./verificacionService");
const { enviarCorreoRecuperacion, correoConfigurado } = require("./emailService");
const { ErrorHttp } = require("../utils/errores");
const logger = require("../utils/logger");

// Reglas de cuentas y sesiones, sin nada de HTTP: el controlador solo decide cómo entregar el resultado (cookie, JSON).

const RESET_EXPIRA_MINUTOS = 15;
const MAX_INTENTOS_CODIGO = 5;
const COSTO_HASH = 10;
const HASH_FALSO = bcrypt.hashSync("contraseña-que-no-pertenece-a-nadie", COSTO_HASH);

const hashToken = (token) => crypto.createHash("sha256").update(token).digest("hex");
const generarCodigo = () => String(crypto.randomInt(0, 1000000)).padStart(6, "0");

// Lo que se devuelve de una cuenta: nunca el hash ni datos internos.
const datosUsuario = (u) => ({ id: u.id, nombre: u.nombre, correo: u.correo, rol: u.rol, correo_verificado: u.correo_verificado });

// El token lleva la versión de sesión de la cuenta: al subirla (cambio o restablecimiento de contraseña) los anteriores dejan de valer.
function firmarToken(usuario) {
  return jwt.sign(
    { id: usuario.id, correo: usuario.correo, rol: usuario.rol, v: usuario.token_version },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || "8h" }
  );
}

// RF-01: registro de turistas y prestadores. El rol administrador no se autoasigna por registro público.
// Con datos básicos del negocio, la cuenta y el perfil de prestador se crean juntos; el perfil nace "incompleto": el prestador
// lo completa y lo envía a revisión desde su portal (RN-01: no publica hasta ser aprobado).
async function registrar({ nombre, correo, password, rol, negocio }) {
  const rolFinal = rol === "prestador" ? "prestador" : "turista";
  if (await Usuario.findOne({ where: { correo } })) throw new ErrorHttp(400, "El correo ya está registrado.");

  const password_hash = await bcrypt.hash(password, COSTO_HASH);
  let prestador = null;
  let usuario;
  try {
    usuario = await sequelize.transaction(async (transaction) => {
      const u = await Usuario.create({
        nombre, correo, password_hash, rol: rolFinal, acepto_terminos_en: new Date(), version_terminos: VERSION_TERMINOS,
      }, { transaction });
      if (rolFinal === "prestador" && negocio) {
        prestador = await Prestador.create({ ...negocio, usuario_id: u.id, estado_verificacion: "incompleto" }, { transaction });
      }
      return u;
    });
  } catch (err) {
    if (err.name === "SequelizeUniqueConstraintError") throw new ErrorHttp(400, "El correo ya está registrado."); // otra solicitud lo registró justo antes
    throw err;
  }

  await verificacion.enviarCodigo(usuario); // código de 6 dígitos para confirmar el correo
  return { usuario, prestador };
}

// RF-01: inicio de sesión. Se compara siempre contra un hash (el real o uno falso) para que responder "no existe"
// no sea más rápido que "clave incorrecta".
async function iniciarSesion({ correo, password }) {
  const usuario = await Usuario.findOne({ where: { correo } });
  const coincide = await bcrypt.compare(password, usuario?.password_hash || HASH_FALSO);
  if (!usuario || !coincide) throw new ErrorHttp(401, "Credenciales inválidas.");
  if (!usuario.activo) throw new ErrorHttp(403, "Tu cuenta está suspendida. Contacta al administrador.");
  return usuario;
}

// RF-01 / RF-16: perfil del usuario autenticado.
async function perfil(id) {
  const usuario = await Usuario.findByPk(id, { attributes: ["id", "nombre", "correo", "rol", "fecha_registro", "correo_verificado"] });
  if (!usuario) throw new ErrorHttp(404, "Usuario no encontrado.");
  return usuario;
}

// Recuperación de contraseña: genera un código real de 6 dígitos, de un solo uso, y lo envía por correo. La respuesta es
// idéntica exista o no la cuenta (mismo contenido y sin esperar al correo) para no revelar qué correos están registrados.
// En desarrollo se añade "modo" (si el correo está configurado), igual en ambos casos; en producción no se devuelve.
async function solicitarRecuperacion(correo) {
  const respuesta = {
    mensaje: "Si el correo está registrado, te enviamos un código para restablecer tu contraseña.",
    ...(process.env.NODE_ENV === "production" ? {} : { modo: correoConfigurado() ? "enviado" : "desarrollo" }),
  };
  const usuario = await Usuario.findOne({ where: { correo } });
  if (!usuario || usuario.eliminado_en) return respuesta;

  const codigo = generarCodigo();
  const expira = new Date(Date.now() + RESET_EXPIRA_MINUTOS * 60 * 1000);
  await PasswordReset.create({ usuario_id: usuario.id, token_hash: hashToken(codigo), expira });
  enviarCorreoRecuperacion({ destinatario: usuario.correo, nombre: usuario.nombre, codigo })
    .catch((err) => logger.error("No se pudo enviar el código de recuperación", err));
  return respuesta;
}

// Confirma el restablecimiento validando el código real (hash + expiración + un solo uso + máximo de intentos).
async function restablecerContrasena({ correo, codigo, password }) {
  const mensajeInvalido = "El código es inválido o ya expiró. Solicita uno nuevo.";
  const usuario = await Usuario.findOne({ where: { correo } });
  if (!usuario) throw new ErrorHttp(400, mensajeInvalido);

  // Solo el código más reciente vigente es válido; cada fallo consume un intento.
  const registro = await PasswordReset.findOne({
    where: { usuario_id: usuario.id, usado: false, expira: { [Op.gt]: new Date() } },
    order: [["fecha_creacion", "DESC"]],
  });
  if (!registro) throw new ErrorHttp(400, mensajeInvalido);
  if (registro.intentos >= MAX_INTENTOS_CODIGO) throw new ErrorHttp(400, "Demasiados intentos. Solicita un código nuevo.");
  if (registro.token_hash !== hashToken(codigo)) {
    await registro.increment("intentos");
    throw new ErrorHttp(400, mensajeInvalido);
  }

  // Subir la versión de sesión cierra todas las sesiones abiertas con la contraseña anterior.
  await usuario.update({ password_hash: await bcrypt.hash(password, COSTO_HASH), token_version: usuario.token_version + 1 });
  await registro.update({ usado: true });
}

// El usuario autenticado edita su nombre y correo. Un correo nuevo vuelve a quedar sin verificar y se le envía un código.
async function actualizarPerfil(id, { nombre, correo }) {
  const usuario = await Usuario.findByPk(id);
  const cambioCorreo = correo !== usuario.correo;
  if (cambioCorreo && (await Usuario.findOne({ where: { correo } }))) throw new ErrorHttp(400, "Ese correo ya está registrado por otra cuenta.");
  await usuario.update({ nombre, correo, ...(cambioCorreo ? { correo_verificado: false } : {}) });
  if (cambioCorreo) await verificacion.enviarCodigo(usuario);
  return usuario;
}

// Confirma el correo con el código de 6 dígitos enviado al registrarse.
async function verificarCorreo(id, codigo) {
  await verificacion.verificarCodigo(await Usuario.findByPk(id), codigo);
}

async function reenviarVerificacion(id) {
  await verificacion.reenviarCodigo(await Usuario.findByPk(id));
}

// Cambio de contraseña con la sesión abierta: exige la actual. Se cierran las demás sesiones; la cuenta devuelta ya trae la versión
// nueva, para que quien lo hizo reciba un token vigente y siga conectado.
async function cambiarPassword(id, { actual, nueva }) {
  const usuario = await Usuario.findByPk(id);
  if (!(await bcrypt.compare(actual, usuario.password_hash))) throw new ErrorHttp(400, "La contraseña actual no es correcta.");
  await usuario.update({ password_hash: await bcrypt.hash(nueva, COSTO_HASH), token_version: usuario.token_version + 1 });
  return usuario;
}

module.exports = {
  datosUsuario, firmarToken, registrar, iniciarSesion, perfil, solicitarRecuperacion, restablecerContrasena,
  actualizarPerfil, verificarCorreo, reenviarVerificacion, cambiarPassword,
};
