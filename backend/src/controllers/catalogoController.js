const catalogo = require("../services/catalogoService");

// Capa HTTP del catálogo: extrae los datos de la petición y delega en el servicio.
// Los errores (ErrorHttp) los convierte en respuesta el manejador central de app.js.

// RF-04: crear un sitio/servicio en el catálogo.
const crear = async (req, res) => res.status(201).json(await catalogo.crear({ datos: req.body, archivo: req.file, usuario: req.usuario }));

// RF-04/RF-05/RF-06: listar con búsqueda, filtros, orden y paginación.
const listar = async (req, res) => res.json(await catalogo.buscar(req.query));

const obtener = async (req, res) => res.json(await catalogo.obtenerDetalle(req.params.id));

const actualizar = async (req, res) => res.json(await catalogo.actualizar({ id: req.params.id, datos: req.body, archivo: req.file, usuario: req.usuario }));

const eliminar = async (req, res) => {
  await catalogo.eliminar({ id: req.params.id, usuario: req.usuario });
  return res.json({ mensaje: "Servicio eliminado." });
};

const cotizarSitio = async (req, res) => res.json(await catalogo.cotizarServicio(req.params.id, req.query));

const calendarioSitio = async (req, res) => res.json(await catalogo.calendario(req.params.id, req.query.mes));

const listarFechasBloqueadas = async (req, res) => res.json(await catalogo.fechasBloqueadas(req.params.id));

const bloquearFecha = async (req, res) =>
  res.status(201).json(await catalogo.bloquearFecha({ id: req.params.id, usuario: req.usuario, fecha: req.body.fecha, motivo: req.body.motivo }));

const desbloquearFecha = async (req, res) => {
  await catalogo.desbloquearFecha({ id: req.params.id, usuario: req.usuario, fechaId: req.params.fechaId });
  return res.json({ mensaje: "Fecha desbloqueada." });
};

const agregarImagenes = async (req, res) =>
  res.status(201).json(await catalogo.agregarImagenes({ id: req.params.id, usuario: req.usuario, archivos: req.files }));

const eliminarImagen = async (req, res) => {
  await catalogo.eliminarImagen({ id: req.params.id, usuario: req.usuario, imagenId: req.params.imagenId });
  return res.json({ mensaje: "Imagen eliminada correctamente." });
};

module.exports = { crear, listar, obtener, actualizar, eliminar, agregarImagenes, eliminarImagen, listarFechasBloqueadas, bloquearFecha, desbloquearFecha, cotizarSitio, calendarioSitio };
