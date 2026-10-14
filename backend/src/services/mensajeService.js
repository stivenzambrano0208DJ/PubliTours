const { Op, QueryTypes } = require("sequelize");
const {
  sequelize, Usuario, Prestador, SitioTuristico, Paquete, Reserva, Conversacion, Mensaje, MensajeImagen, ReporteMensaje,
} = require("../models");
const { TEXTO_MAX, MENSAJES_POR_HORA, CONVERSACIONES_NUEVAS_POR_DIA } = require("../config/mensajeria");
const { notificar, notificarVarios } = require("./notificacionService");
const auditoria = require("./auditoriaService");
const { prestadorOperativo } = require("./visibilidad");
const { prestadorDeUsuario } = require("./negocioPropio");
const { ErrorHttp } = require("../utils/errores");
const { rutaArchivoMensaje, eliminarArchivosMensaje } = require("../utils/archivos");
const politicas = require("../politicas");

// Mensajería entre turistas y negocios. Las reglas de quién puede qué viven en politicas/mensajes.js; los números (tope de texto,
// de fotos, de mensajes por hora) en config/mensajeria.js. El negocio solo responde: una conversación la abre siempre quien pregunta.

const MENSAJE_NEGOCIO_NO_DISPONIBLE = "Este negocio no está disponible por el momento.";
const hace = (ms) => new Date(Date.now() - ms);
const HORA = 3600000;
const DIA = 24 * HORA;

// ---------------------------------------------------------------- cargar una conversación con su negocio
async function cargarConversacion(id) {
  const conversacion = await Conversacion.findByPk(id, { include: [{ model: Prestador, as: "negocio" }, { model: Usuario, as: "turista", attributes: ["id", "nombre"] }] });
  if (!conversacion) throw new ErrorHttp(404, "Conversación no encontrada.");
  return conversacion;
}
const ladoDe = (usuario, conversacion) => (conversacion.turista_id === usuario.id ? "turista" : "negocio");

// ---------------------------------------------------------------- sobre qué se pregunta
// Sale siempre del servidor (del servicio, el paquete o la reserva), nunca de un id de negocio que mande el cliente.
async function resolverContexto(usuario, { sitio_id, paquete_id, reserva_id }) {
  if (sitio_id) {
    const sitio = await SitioTuristico.findByPk(sitio_id);
    if (!sitio || sitio.estado !== "activo") throw new ErrorHttp(404, "Sitio no encontrado.");
    if (!sitio.prestador_id) throw new ErrorHttp(400, "Este servicio no tiene un negocio con quien conversar.");
    return { negocio: await Prestador.findByPk(sitio.prestador_id), campos: { sitio_id: sitio.id } };
  }
  if (paquete_id) {
    const paquete = await Paquete.findByPk(paquete_id);
    if (!paquete || paquete.estado !== "activo") throw new ErrorHttp(404, "Paquete no encontrado.");
    return { negocio: await Prestador.findByPk(paquete.prestador_id), campos: { paquete_id: paquete.id } };
  }
  const reserva = await Reserva.findByPk(reserva_id);
  politicas.reservas.exigirTuristaDeLaReserva(usuario.id, reserva); // solo se escribe sobre reservas propias
  return { negocio: await Prestador.findByPk(reserva.prestador_id), campos: { reserva_id: reserva.id } };
}

// ---------------------------------------------------------------- enviar
async function guardarMensaje({ usuario, conversacion, texto, archivos, campos = {} }) {
  const negocio = conversacion.negocio;
  const limpio = String(texto ?? "").trim();
  if (limpio.length > TEXTO_MAX) throw new ErrorHttp(400, `El mensaje no puede pasar de ${TEXTO_MAX} caracteres.`);
  if (!limpio && archivos.length === 0) throw new ErrorHttp(400, "Escribe un mensaje o adjunta una foto.");
  if (!(await prestadorOperativo(negocio.id))) throw new ErrorHttp(400, MENSAJE_NEGOCIO_NO_DISPONIBLE);

  const enviadosEstaHora = await Mensaje.count({ where: { autor_id: usuario.id, creado_en: { [Op.gt]: hace(HORA) } } });
  if (enviadosEstaHora >= MENSAJES_POR_HORA) throw new ErrorHttp(429, "Estás enviando muchos mensajes. Espera unos minutos e inténtalo de nuevo.");

  const lado = ladoDe(usuario, conversacion);
  const destinatarioId = lado === "turista" ? negocio.usuario_id : conversacion.turista_id;
  const campoLeidoDestino = lado === "turista" ? "prestador_leido_hasta" : "turista_leido_hasta";

  // Se avisa una sola vez por "racha": si el destinatario ya tenía mensajes tuyos sin leer, no se le vuelve a notificar.
  const sinLeerDelAutor = await Mensaje.count({
    where: { conversacion_id: conversacion.id, autor_id: usuario.id, retirado: false, id: { [Op.gt]: conversacion[campoLeidoDestino] } },
  });

  const mensaje = await sequelize.transaction(async (transaction) => {
    const nuevo = await Mensaje.create({ conversacion_id: conversacion.id, autor_id: usuario.id, texto: limpio || null, ...campos }, { transaction });
    if (archivos.length > 0) {
      await MensajeImagen.bulkCreate(archivos.map((a, orden) => ({ mensaje_id: nuevo.id, archivo: a.filename, tipo: a.mimetype, orden })), { transaction });
    }
    await conversacion.update({ ultimo_mensaje_en: new Date(), [lado === "turista" ? "turista_leido_hasta" : "prestador_leido_hasta"]: nuevo.id }, { transaction });
    return nuevo;
  });

  if (sinLeerDelAutor === 0) {
    const quien = lado === "turista" ? conversacion.turista.nombre : negocio.nombre_negocio;
    await notificar(destinatarioId, "mensaje_nuevo", `${quien} te ${lado === "turista" ? "escribió" : "respondió"}. Abre tus mensajes para verlo.`);
  }
  return mensaje;
}

// Una turista (o un prestador que pregunta a OTRO negocio) abre la conversación con un negocio sobre un servicio, paquete o reserva,
// o continúa la que ya tenía. Por eso aquí no hay forma de que un negocio escriba primero.
async function iniciarConversacion({ usuario, sitio_id, paquete_id, reserva_id, texto, archivos = [] }) {
  const { negocio, campos } = await resolverContexto(usuario, { sitio_id, paquete_id, reserva_id });
  politicas.mensajes.exigirEscribirANegocio(usuario, negocio);
  if (!(await prestadorOperativo(negocio.id))) throw new ErrorHttp(400, MENSAJE_NEGOCIO_NO_DISPONIBLE);

  let conversacion = await Conversacion.findOne({ where: { turista_id: usuario.id, prestador_id: negocio.id } });
  if (!conversacion) {
    const nuevasHoy = await Conversacion.count({ where: { turista_id: usuario.id, creada_en: { [Op.gt]: hace(DIA) } } });
    if (nuevasHoy >= CONVERSACIONES_NUEVAS_POR_DIA) {
      throw new ErrorHttp(429, "Ya escribiste a varios negocios hoy. Espera a que te respondan o inténtalo mañana.");
    }
    [conversacion] = await Conversacion.findOrCreate({ where: { turista_id: usuario.id, prestador_id: negocio.id } });
  }
  conversacion = await cargarConversacion(conversacion.id);
  const mensaje = await guardarMensaje({ usuario, conversacion, texto, archivos, campos });
  return { conversacion_id: conversacion.id, mensaje: await presentarMensaje(mensaje.id, usuario, conversacion) };
}

async function enviarMensaje({ usuario, conversacion_id, texto, archivos = [] }) {
  const conversacion = await cargarConversacion(conversacion_id);
  politicas.mensajes.exigirParticipante(usuario, conversacion, conversacion.negocio);
  const turistaYaEscribio = (await Mensaje.count({ where: { conversacion_id, autor_id: conversacion.turista_id } })) > 0;
  politicas.mensajes.exigirEscribirEnConversacion(usuario, conversacion, conversacion.negocio, { turistaYaEscribio });
  const mensaje = await guardarMensaje({ usuario, conversacion, texto, archivos });
  return presentarMensaje(mensaje.id, usuario, conversacion);
}

// ---------------------------------------------------------------- presentar (lo que ve el cliente)
async function nombresDeContexto(mensajes) {
  const ids = (campo) => [...new Set(mensajes.map((m) => m[campo]).filter(Boolean))];
  const [sitios, paquetes, reservas] = await Promise.all([
    ids("sitio_id").length ? SitioTuristico.findAll({ where: { id: ids("sitio_id") }, attributes: ["id", "nombre"], raw: true }) : [],
    ids("paquete_id").length ? Paquete.findAll({ where: { id: ids("paquete_id") }, attributes: ["id", "nombre"], raw: true }) : [],
    ids("reserva_id").length
      ? Reserva.findAll({ where: { id: ids("reserva_id") }, include: [{ model: SitioTuristico, as: "sitio", attributes: ["nombre"] }, { model: Paquete, as: "paquete", attributes: ["nombre"] }] })
      : [],
  ]);
  return {
    sitio: new Map(sitios.map((s) => [s.id, s.nombre])),
    paquete: new Map(paquetes.map((p) => [p.id, p.nombre])),
    reserva: new Map(reservas.map((r) => [r.id, r.paquete?.nombre || r.sitio?.nombre])),
  };
}

function contextoDe(mensaje, nombres) {
  if (mensaje.sitio_id) return { tipo: "sitio", id: mensaje.sitio_id, nombre: nombres.sitio.get(mensaje.sitio_id) || null };
  if (mensaje.paquete_id) return { tipo: "paquete", id: mensaje.paquete_id, nombre: nombres.paquete.get(mensaje.paquete_id) || null };
  if (mensaje.reserva_id) return { tipo: "reserva", id: mensaje.reserva_id, nombre: nombres.reserva.get(mensaje.reserva_id) || null };
  return null;
}

// Un mensaje retirado por la administración no muestra ni texto ni fotos a nadie.
const presentar = (m, usuario, conversacion, nombres) => ({
  id: m.id,
  de: m.autor_id === conversacion.turista_id ? "turista" : "negocio",
  mio: m.autor_id === usuario.id,
  texto: m.retirado ? null : m.texto,
  retirado: m.retirado,
  creado_en: m.creado_en,
  imagenes: m.retirado ? [] : [...(m.imagenes || [])].sort((a, b) => a.orden - b.orden).map((i) => ({ id: i.id })),
  contexto: contextoDe(m, nombres),
});

async function presentarMensaje(id, usuario, conversacion) {
  const m = await Mensaje.findByPk(id, { include: [{ model: MensajeImagen, as: "imagenes" }] });
  return presentar(m, usuario, conversacion, await nombresDeContexto([m]));
}

// ---------------------------------------------------------------- listar y leer
// Mis conversaciones (como turista y como dueño de un negocio), la más reciente primero, con lo que me falta por leer.
async function listarConversaciones(usuario) {
  const negocio = await prestadorDeUsuario(usuario.id);
  const conversaciones = await Conversacion.findAll({
    where: { [Op.or]: [{ turista_id: usuario.id }, ...(negocio ? [{ prestador_id: negocio.id }] : [])] },
    include: [{ model: Prestador, as: "negocio", attributes: ["id", "nombre_negocio", "usuario_id"] }, { model: Usuario, as: "turista", attributes: ["id", "nombre"] }],
    order: [["ultimo_mensaje_en", "DESC"]],
    limit: 100,
  });
  if (conversaciones.length === 0) return [];
  const ids = conversaciones.map((c) => c.id);

  const [sinLeer, ultimos] = await Promise.all([
    sequelize.query(
      `SELECT c.id AS conversacion_id, COUNT(m.id)::int AS total
         FROM conversaciones c JOIN prestadores p ON p.id = c.prestador_id
         JOIN mensajes m ON m.conversacion_id = c.id AND m.retirado = false AND m.autor_id <> :yo
        WHERE c.id IN (:ids) AND ((c.turista_id = :yo AND m.id > c.turista_leido_hasta) OR (p.usuario_id = :yo AND m.id > c.prestador_leido_hasta))
        GROUP BY c.id`,
      { replacements: { yo: usuario.id, ids }, type: QueryTypes.SELECT }
    ),
    sequelize.query(
      `SELECT DISTINCT ON (m.conversacion_id) m.conversacion_id, m.id, m.autor_id, m.texto, m.retirado, m.creado_en,
              (SELECT COUNT(*)::int FROM mensaje_imagenes i WHERE i.mensaje_id = m.id) AS fotos
         FROM mensajes m WHERE m.conversacion_id IN (:ids) ORDER BY m.conversacion_id, m.id DESC`,
      { replacements: { ids }, type: QueryTypes.SELECT }
    ),
  ]);
  const pendientes = new Map(sinLeer.map((r) => [r.conversacion_id, r.total]));
  const ultimoDe = new Map(ultimos.map((u) => [u.conversacion_id, u]));

  return conversaciones.map((c) => {
    const lado = ladoDe(usuario, c);
    const u = ultimoDe.get(c.id);
    const vistaPrevia = !u ? null : u.retirado ? null : (u.texto || "").slice(0, 120);
    return {
      id: c.id,
      lado,
      contraparte: { nombre: lado === "turista" ? c.negocio.nombre_negocio : c.turista.nombre },
      sin_leer: pendientes.get(c.id) || 0,
      ultimo: u ? { de: u.autor_id === c.turista_id ? "turista" : "negocio", mio: u.autor_id === usuario.id, texto: vistaPrevia, con_fotos: u.fotos > 0, retirado: u.retirado, creado_en: u.creado_en } : null,
      ultimo_mensaje_en: c.ultimo_mensaje_en,
    };
  });
}

// Los mensajes de una conversación: los 50 más recientes (con `antes` se pide una página anterior; con `despues`, solo los nuevos).
async function obtenerConversacion({ usuario, id, antes, despues }) {
  const conversacion = await cargarConversacion(id);
  politicas.mensajes.exigirParticipante(usuario, conversacion, conversacion.negocio);

  const where = { conversacion_id: conversacion.id };
  if (despues) where.id = { [Op.gt]: despues };
  else if (antes) where.id = { [Op.lt]: antes };
  const filas = await Mensaje.findAll({
    where, include: [{ model: MensajeImagen, as: "imagenes" }],
    order: [["id", despues ? "ASC" : "DESC"]], limit: despues ? 200 : 51,
  });
  const hayMas = !despues && filas.length > 50;
  const pagina = (despues ? filas : filas.slice(0, 50).reverse());
  const nombres = await nombresDeContexto(pagina);
  const lado = ladoDe(usuario, conversacion);

  return {
    id: conversacion.id,
    lado,
    contraparte: { nombre: lado === "turista" ? conversacion.negocio.nombre_negocio : conversacion.turista.nombre },
    puede_escribir: await prestadorOperativo(conversacion.negocio.id),
    hay_mas: hayMas,
    mensajes: pagina.map((m) => presentar(m, usuario, conversacion, nombres)),
  };
}

// Marca como leído todo lo que hay hasta ahora (solo mueve el puntero de quien lo pide, nunca hacia atrás).
async function marcarLeida({ usuario, id }) {
  const conversacion = await cargarConversacion(id);
  politicas.mensajes.exigirParticipante(usuario, conversacion, conversacion.negocio);
  const campo = ladoDe(usuario, conversacion) === "turista" ? "turista_leido_hasta" : "prestador_leido_hasta";
  await sequelize.query(
    `UPDATE conversaciones SET ${campo} = GREATEST(${campo}, COALESCE((SELECT MAX(id) FROM mensajes WHERE conversacion_id = :id), 0)) WHERE id = :id`,
    { replacements: { id: conversacion.id } }
  );
}

// Total de mensajes sin leer, para el contador del encabezado.
async function contarSinLeer(usuario) {
  const [{ total }] = await sequelize.query(
    `SELECT COUNT(m.id)::int AS total
       FROM conversaciones c JOIN prestadores p ON p.id = c.prestador_id
       JOIN mensajes m ON m.conversacion_id = c.id AND m.retirado = false AND m.autor_id <> :yo
      WHERE (c.turista_id = :yo AND m.id > c.turista_leido_hasta) OR (p.usuario_id = :yo AND m.id > c.prestador_leido_hasta)`,
    { replacements: { yo: usuario.id }, type: QueryTypes.SELECT }
  );
  return { total };
}

// ---------------------------------------------------------------- fotos (privadas)
// Devuelve dónde está el archivo si esta persona puede verlo. Las fotos solo salen por aquí: nunca por /uploads.
async function abrirImagen({ usuario, imagenId }) {
  const imagen = await MensajeImagen.findByPk(imagenId, {
    include: [{ model: Mensaje, as: "mensaje", include: [{ model: Conversacion, as: "conversacion", include: [{ model: Prestador, as: "negocio" }] }] }],
  });
  if (!imagen) throw new ErrorHttp(404, "Foto no encontrada.");
  const { mensaje } = imagen;
  const participante = politicas.mensajes.esParticipante(usuario, mensaje.conversacion, mensaje.conversacion.negocio);
  const reportado = (await ReporteMensaje.count({ where: { mensaje_id: mensaje.id } })) > 0;
  if (!politicas.mensajes.puedeVerImagenMensaje(usuario, { participante, retirado: mensaje.retirado, reportado })) throw new ErrorHttp(404, "Foto no encontrada.");
  const ruta = rutaArchivoMensaje(imagen.archivo);
  if (!ruta) throw new ErrorHttp(404, "Foto no encontrada.");
  return { ruta, tipo: imagen.tipo };
}

// ---------------------------------------------------------------- reportes
async function reportarMensaje({ usuario, mensajeId, motivo, detalle }) {
  const mensaje = await Mensaje.findByPk(mensajeId);
  if (!mensaje) throw new ErrorHttp(404, "Mensaje no encontrado.");
  const conversacion = await cargarConversacion(mensaje.conversacion_id);
  const participante = politicas.mensajes.esParticipante(usuario, conversacion, conversacion.negocio);
  if (!participante) throw new ErrorHttp(404, "Mensaje no encontrado."); // quien no participa no sabe que existe
  politicas.mensajes.exigirReportarMensaje(usuario, mensaje, participante);

  if (await ReporteMensaje.findOne({ where: { mensaje_id: mensaje.id, reportado_por: usuario.id } })) throw new ErrorHttp(400, "Ya reportaste este mensaje.");
  await ReporteMensaje.create({ mensaje_id: mensaje.id, reportado_por: usuario.id, motivo, detalle: detalle || null });

  const admins = await Usuario.findAll({ where: { rol: "administrador", activo: true }, attributes: ["id"] });
  await notificarVarios(admins.map((a) => a.id), "mensaje_reportado", `Se reportó un mensaje (${motivo.replace("_", " ")}). Revísalo en «Mensajes reportados».`);
  return { mensaje: "Gracias. La administración revisará el mensaje." };
}

// Para la administración: SOLO los mensajes reportados (nunca las conversaciones enteras).
async function listarReportes({ estado = "pendiente" } = {}) {
  const reportes = await ReporteMensaje.findAll({
    where: { estado },
    include: [
      { model: Usuario, as: "reportador", attributes: ["id", "nombre"] },
      { model: Mensaje, as: "mensaje", include: [
        { model: MensajeImagen, as: "imagenes" },
        { model: Usuario, as: "autor", attributes: ["id", "nombre"] },
        { model: Conversacion, as: "conversacion", include: [{ model: Prestador, as: "negocio", attributes: ["id", "nombre_negocio"] }, { model: Usuario, as: "turista", attributes: ["id", "nombre"] }] },
      ] },
    ],
    order: [["creado_en", "DESC"]],
    limit: 200,
  });
  return reportes.map((r) => ({
    id: r.id, motivo: r.motivo, detalle: r.detalle, estado: r.estado, creado_en: r.creado_en,
    reportado_por: r.reportador?.nombre || null,
    mensaje: {
      id: r.mensaje.id, texto: r.mensaje.texto, retirado: r.mensaje.retirado, creado_en: r.mensaje.creado_en, autor: r.mensaje.autor?.nombre || null,
      imagenes: r.mensaje.imagenes.map((i) => ({ id: i.id })),
      turista: r.mensaje.conversacion.turista?.nombre || null, negocio: r.mensaje.conversacion.negocio?.nombre_negocio || null,
    },
  }));
}

async function resolverReporte({ id, accion, admin_id }) {
  const reporte = await ReporteMensaje.findByPk(id, { include: [{ model: Mensaje, as: "mensaje" }] });
  if (!reporte) throw new ErrorHttp(404, "Reporte no encontrado.");
  if (reporte.estado !== "pendiente") throw new ErrorHttp(400, "Este reporte ya fue revisado.");
  const estado = accion === "retirar" ? "retirado" : "descartado";

  await sequelize.transaction(async (transaction) => {
    // Un mismo mensaje puede tener varios reportes: la decisión vale para todos los que seguían pendientes.
    await ReporteMensaje.update({ estado, revisado_por: admin_id, revisado_en: new Date() }, { where: { mensaje_id: reporte.mensaje_id, estado: "pendiente" }, transaction });
    if (accion === "retirar") await Mensaje.update({ retirado: true }, { where: { id: reporte.mensaje_id }, transaction });
  });
  await auditoria.registrar({
    actor_id: admin_id, accion: accion === "retirar" ? "mensaje_retirado" : "reporte_descartado", entidad: "mensaje", entidad_id: reporte.mensaje_id, detalle: `Motivo reportado: ${reporte.motivo}`,
  });
  if (accion === "retirar") await notificar(reporte.mensaje.autor_id, "mensaje_retirado", "Un mensaje tuyo fue retirado por la administración por no cumplir las normas de la comunidad.");
  return { id: reporte.id, estado };
}

// ---------------------------------------------------------------- datos personales
// Borra todas las conversaciones de una persona (como turista y como dueña de un negocio) con sus mensajes. Devuelve los archivos de las fotos
// para que quien llama los borre del disco una vez confirmada la transacción.
async function eliminarConversacionesDe(usuario_id, transaction) {
  const negocio = await prestadorDeUsuario(usuario_id);
  const donde = { [Op.or]: [{ turista_id: usuario_id }, ...(negocio ? [{ prestador_id: negocio.id }] : [])] };
  const ids = (await Conversacion.findAll({ where: donde, attributes: ["id"], transaction })).map((c) => c.id);
  if (ids.length === 0) return [];
  const archivos = (await MensajeImagen.findAll({
    attributes: ["archivo"], transaction,
    include: [{ model: Mensaje, as: "mensaje", attributes: [], where: { conversacion_id: ids } }],
  })).map((i) => i.archivo);
  await Conversacion.destroy({ where: { id: ids }, transaction }); // los mensajes, fotos y reportes caen en cascada
  return archivos;
}

// Para la descarga de datos: las conversaciones de la persona con su texto (de las fotos solo cuántas hay).
async function exportarMensajes(usuario) {
  const negocio = await prestadorDeUsuario(usuario.id);
  const conversaciones = await Conversacion.findAll({
    where: { [Op.or]: [{ turista_id: usuario.id }, ...(negocio ? [{ prestador_id: negocio.id }] : [])] },
    include: [
      { model: Prestador, as: "negocio", attributes: ["nombre_negocio", "usuario_id"] }, { model: Usuario, as: "turista", attributes: ["nombre"] },
      { model: Mensaje, as: "mensajes", include: [{ model: MensajeImagen, as: "imagenes", attributes: ["id"] }] },
    ],
    order: [["id", "ASC"], [{ model: Mensaje, as: "mensajes" }, "id", "ASC"]],
  });
  return conversaciones.map((c) => ({
    con: ladoDe(usuario, c) === "turista" ? c.negocio.nombre_negocio : c.turista.nombre,
    como: ladoDe(usuario, c) === "turista" ? "turista" : "negocio",
    mensajes: c.mensajes.map((m) => ({ fecha: m.creado_en, de: m.autor_id === usuario.id ? "tú" : "la otra persona", texto: m.retirado ? null : m.texto, fotos: m.imagenes.length, retirado: m.retirado })),
  }));
}

module.exports = {
  iniciarConversacion, enviarMensaje, listarConversaciones, obtenerConversacion, marcarLeida, contarSinLeer, abrirImagen,
  reportarMensaje, listarReportes, resolverReporte, eliminarConversacionesDe, exportarMensajes, eliminarArchivosMensaje,
};
