const crypto = require("crypto");
const logger = require("../utils/logger");
const { Op } = require("sequelize");
const { Usuario, CodigoVerificacion } = require("../models");
const { enviarCodigoVerificacion } = require("./emailService");
const { ErrorHttp } = require("../utils/errores");

const EXPIRA_HORAS = 24;
const MAX_INTENTOS = 5;
const ESPERA_REENVIO_SEGUNDOS = 60;

const hash = (codigo) => crypto.createHash("sha256").update(codigo).digest("hex");
const generarCodigo = () => String(crypto.randomInt(0, 1000000)).padStart(6, "0");

// Crea un código nuevo (invalida los anteriores) y lo envía por correo. No lanza si el correo falla.
async function enviarCodigo(usuario) {
  await CodigoVerificacion.update({ usado: true }, { where: { usuario_id: usuario.id, usado: false } });
  const codigo = generarCodigo();
  await CodigoVerificacion.create({
    usuario_id: usuario.id, codigo_hash: hash(codigo), expira: new Date(Date.now() + EXPIRA_HORAS * 3600 * 1000),
  });
  // El correo sale sin bloquear la respuesta; si falla, el usuario puede pedir un reenvío.
  enviarCodigoVerificacion({ destinatario: usuario.correo, nombre: usuario.nombre, codigo })
    .catch((err) => logger.error("No se pudo enviar el código de verificación", err));
}

// Reenvío con una espera mínima entre códigos para no usar el correo como ametralladora.
async function reenviarCodigo(usuario) {
  if (usuario.correo_verificado) throw new ErrorHttp(400, "Tu correo ya está verificado.");
  const ultimo = await CodigoVerificacion.findOne({ where: { usuario_id: usuario.id }, order: [["fecha_creacion", "DESC"]] });
  if (ultimo) {
    const segundos = Math.ceil((ESPERA_REENVIO_SEGUNDOS * 1000 - (Date.now() - new Date(ultimo.fecha_creacion).getTime())) / 1000);
    if (segundos > 0) throw new ErrorHttp(400, `Espera ${segundos} segundos antes de pedir otro código.`);
  }
  await enviarCodigo(usuario);
}

// Valida el código (hash, vigencia, un solo uso y máximo de intentos) y marca el correo como verificado.
async function verificarCodigo(usuario, codigo) {
  if (usuario.correo_verificado) return;
  const mensajeInvalido = "El código es inválido o ya expiró. Pide uno nuevo.";
  const registro = await CodigoVerificacion.findOne({
    where: { usuario_id: usuario.id, usado: false, expira: { [Op.gt]: new Date() } },
    order: [["fecha_creacion", "DESC"]],
  });
  if (!registro) throw new ErrorHttp(400, mensajeInvalido);
  if (registro.intentos >= MAX_INTENTOS) throw new ErrorHttp(400, "Demasiados intentos. Pide un código nuevo.");
  if (registro.codigo_hash !== hash(codigo)) {
    await registro.increment("intentos");
    throw new ErrorHttp(400, mensajeInvalido);
  }
  await registro.update({ usado: true });
  await Usuario.update({ correo_verificado: true }, { where: { id: usuario.id } });
}

module.exports = { enviarCodigo, reenviarCodigo, verificarCodigo };
