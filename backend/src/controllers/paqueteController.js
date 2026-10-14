const paqueteService = require("../services/paqueteService");
const disponibilidad = require("../services/disponibilidadService");
const { mesValidoOActual } = require("../utils/fechas");
const { ErrorHttp } = require("../utils/errores");

async function listar(req, res) {
  return res.json(await paqueteService.listarPublicos({ texto: req.query.texto }));
}

const obtener = async (req, res) => res.json(await paqueteService.obtenerPublico(req.params.id));

async function fechasBloqueadas(req, res) {
  return res.json(await paqueteService.fechasBloqueadasDelPaquete(req.params.id));
}

async function calendario(req, res) {
  const mes = mesValidoOActual(req.query.mes);
  const datos = await disponibilidad.calendario({ tipo: "paquete", id: req.params.id, mes });
  if (!datos) throw new ErrorHttp(404, "Paquete no encontrado.");
  return res.json(datos);
}

const misPaquetes = async (req, res) => res.json(await paqueteService.listarDelPrestador(req.usuario.id));

// La foto de portada llega como archivo (multipart); el resto de los datos ya viene validado en req.body.
const conImagen = (req) => ({ ...req.body, ...(req.file ? { imagen_url: `/uploads/sitios/${req.file.filename}` } : {}) });

const crear = async (req, res) => res.status(201).json(await paqueteService.crearPaquete({ usuario_id: req.usuario.id, datos: conImagen(req) }));

const actualizar = async (req, res) =>
  res.json(await paqueteService.actualizarPaquete({ id: req.params.id, usuario_id: req.usuario.id, datos: conImagen(req) }));

const cambiarEstado = async (req, res) =>
  res.json(await paqueteService.cambiarEstado({ id: req.params.id, usuario_id: req.usuario.id, estado: req.body.estado }));

const agregarImagenes = async (req, res) =>
  res.status(201).json(await paqueteService.agregarImagenes({ id: req.params.id, usuario_id: req.usuario.id, archivos: req.files }));

async function eliminarImagen(req, res) {
  await paqueteService.eliminarImagen({ id: req.params.id, usuario_id: req.usuario.id, imagenId: req.params.imagenId });
  return res.json({ mensaje: "Imagen eliminada correctamente." });
}

async function eliminar(req, res) {
  await paqueteService.archivarPaquete({ id: req.params.id, usuario_id: req.usuario.id });
  return res.json({ mensaje: "Paquete eliminado." });
}

module.exports = { listar, obtener, fechasBloqueadas, calendario, misPaquetes, crear, actualizar, cambiarEstado, agregarImagenes, eliminarImagen, eliminar };
