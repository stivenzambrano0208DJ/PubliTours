const adminService = require("../services/adminService");
const mensajeService = require("../services/mensajeService");
const auditoria = require("../services/auditoriaService");
const reportes = require("../services/adminReportesService");
const invitaciones = require("../services/invitacionService");
const { ErrorHttp } = require("../utils/errores");

// Zona del administrador: la moderación y las listas viven en services/adminService.js, los reportes en adminReportesService.js.

const actor = (req) => req.usuario.id;

// Usuarios: listado y suspensión/reactivación.
const listarUsuarios = async (req, res) => res.json(await adminService.listarUsuarios(req.query));
const cambiarEstadoUsuario = async (req, res) => res.json(await adminService.cambiarEstadoUsuario({ id: req.params.id, activo: req.body.activo, actor_id: actor(req) }));

// Servicios y paquetes: listado para moderación y ocultar/publicar.
const listarSitios = async (req, res) => res.json(await adminService.listarSitios(req.query));
const moderarSitio = async (req, res) => res.json(await adminService.moderarSitio({ id: req.params.id, ...req.body, actor_id: actor(req) }));
const listarPaquetes = async (req, res) => res.json(await adminService.listarPaquetes(req.query));
const moderarPaquete = async (req, res) => res.json(await adminService.moderarPaquete({ id: req.params.id, ...req.body, actor_id: actor(req) }));

// Reseñas: listado y retiro.
const listarResenas = async (req, res) => res.json(await adminService.listarResenas());
async function eliminarResena(req, res) {
  await adminService.eliminarResena({ id: req.params.id, actor_id: actor(req) });
  return res.json({ mensaje: "Reseña eliminada." });
}

// Mensajes reportados por turistas y negocios: la administración ve solo ese mensaje (con sus fotos) y decide descartar o retirar.
const ESTADOS_REPORTE = ["pendiente", "descartado", "retirado"];
const listarReportesMensajes = async (req, res) => res.json(await mensajeService.listarReportes({ estado: ESTADOS_REPORTE.includes(req.query.estado) ? req.query.estado : "pendiente" }));
const resolverReporteMensaje = async (req, res) => res.json(await mensajeService.resolverReporte({ id: req.params.id, accion: req.body.accion, admin_id: actor(req) }));

// Tendencias por mes (agregados) y su descarga en CSV.
const tendencias = async (req, res) => res.json(await reportes.tendencias(req.query));

const descargarTendencias = async (req, res) => {
  const { nombre, contenido } = await reportes.tendenciasCsv(req.query);
  res.setHeader("Content-Type", "text/csv; charset=utf-8");
  res.setHeader("Content-Disposition", `attachment; filename="${nombre}"`);
  return res.send(contenido);
};

const historial = async (req, res) => res.json(await auditoria.listar(req.query));

// Anuncio a los negocios, como notificación dentro de la plataforma.
const anunciar = async (req, res) => {
  const resultado = await reportes.enviarAnuncio({ actor_id: actor(req), ...req.body });
  if (resultado.enviados === 0) throw new ErrorHttp(400, "No hay negocios a quienes enviar el anuncio.");
  return res.status(201).json(resultado);
};

const invitarNegocio = async (req, res) => res.status(201).json(await invitaciones.invitar({ ...req.body, admin_id: actor(req) }));
const listarInvitaciones = async (req, res) => res.json(await invitaciones.listar());

module.exports = { invitarNegocio, listarInvitaciones, listarReportesMensajes, resolverReporteMensaje, tendencias, descargarTendencias, historial, anunciar, listarPaquetes, moderarPaquete, listarUsuarios, cambiarEstadoUsuario, listarSitios, moderarSitio, listarResenas, eliminarResena };
