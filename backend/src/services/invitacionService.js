const { Op } = require("sequelize");
const { Invitacion, Usuario } = require("../models");
const { ErrorHttp } = require("../utils/errores");
const { enviarCorreo } = require("./emailService");
const auditoria = require("./auditoriaService");
const { INVITACIONES_POR_DIA, comisionPorcentaje } = require("../config/negocio");

const DIAS_ENTRE_INVITACIONES = 7; // a un mismo correo no se le insiste más de una vez por semana

// La administración invita por correo a un negocio de la región a publicar en PubliTours. Todo lo que dice el correo es cierto
// (registro sin costo, verificación por la administración, comisión estimada sobre las reservas aceptadas).
async function invitar({ correo, nombre_negocio, mensaje, admin_id }) {
  if (await Usuario.findOne({ where: { correo }, attributes: ["id"] })) throw new ErrorHttp(400, "Ese correo ya tiene una cuenta en PubliTours.");
  const reciente = await Invitacion.findOne({ where: { correo, enviada_en: { [Op.gte]: new Date(Date.now() - DIAS_ENTRE_INVITACIONES * 864e5) } } });
  if (reciente) throw new ErrorHttp(400, "Ya invitaste a ese correo hace menos de una semana.");
  const hoy = await Invitacion.count({ where: { enviada_por: admin_id, enviada_en: { [Op.gte]: new Date(Date.now() - 864e5) } } });
  if (hoy >= INVITACIONES_POR_DIA) throw new ErrorHttp(429, `Puedes enviar hasta ${INVITACIONES_POR_DIA} invitaciones al día.`);

  const envio = await enviarCorreo({
    destinatario: correo,
    asunto: "Te invitamos a publicar tu negocio en PubliTours",
    titulo: "Publica tu negocio en PubliTours",
    lineas: [
      `Hola${nombre_negocio ? `, ${nombre_negocio}` : ""}:`,
      "PubliTours es la plataforma de turismo del Caquetá: los viajeros encuentran experiencias verificadas, arman su itinerario y reservan directamente con los negocios de la región.",
      ...(mensaje ? [mensaje] : []),
      `Crear tu cuenta no tiene costo. Cada negocio lo revisa la administración antes de publicarse. Sobre las reservas que aceptes, la plataforma estima una comisión del ${comisionPorcentaje()} %.`,
    ],
    enlace: { ruta: "/conviertete-en-prestador", texto: "Conocer más y registrar mi negocio" },
  });
  if (envio.modo === "error") throw new ErrorHttp(502, "No se pudo enviar el correo. Inténtalo de nuevo en unos minutos.");

  const invitacion = await Invitacion.create({ correo, nombre_negocio: nombre_negocio || null, enviada_por: admin_id });
  await auditoria.registrar({ actor_id: admin_id, accion: "negocio_invitado", entidad: "invitacion", entidad_id: invitacion.id, detalle: nombre_negocio || null });
  return { id: invitacion.id, correo, nombre_negocio: invitacion.nombre_negocio, enviada_en: invitacion.enviada_en, registrado: false };
}

// Las invitaciones enviadas, con si ese correo ya se registró (y si lo hizo como negocio): así se mide si funcionan.
async function listar() {
  const invitaciones = await Invitacion.findAll({ order: [["enviada_en", "DESC"]], limit: 200 });
  const correos = [...new Set(invitaciones.map((i) => i.correo))];
  const usuarios = correos.length ? await Usuario.findAll({ where: { correo: correos }, attributes: ["correo", "rol"] }) : [];
  const rolDe = Object.fromEntries(usuarios.map((u) => [u.correo, u.rol]));
  return invitaciones.map((i) => ({
    id: i.id, correo: i.correo, nombre_negocio: i.nombre_negocio, enviada_en: i.enviada_en,
    registrado: Boolean(rolDe[i.correo]), como_negocio: rolDe[i.correo] === "prestador",
  }));
}

module.exports = { invitar, listar };
