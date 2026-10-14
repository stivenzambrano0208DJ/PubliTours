const { Op } = require("sequelize");
const { adjuntarResumen } = require("./resenaService");
const { eliminarArchivoSubido } = require("../utils/archivos");
const { sequelize, Paquete, PaqueteItem, ImagenPaquete, SitioTuristico, Prestador, Reserva, FechaBloqueada } = require("../models");
const { hoyLocal } = require("../utils/fechas");
const { ErrorHttp } = require("../utils/errores");
const { paqueteVisibleSql, prestadorOperativo } = require("./visibilidad");
const { prestadorDeUsuario } = require("./negocioPropio");
const politicas = require("../politicas");

const MAX_FOTOS_GALERIA = 8;


const INCLUDE_ITEMS = [
  { model: PaqueteItem, as: "items", include: [{ model: SitioTuristico, as: "sitio" }] },
  { model: Prestador, attributes: ["id", "nombre_negocio", "municipio", "telefono", "estado_verificacion"] },
  { model: ImagenPaquete, as: "imagenes", attributes: ["id", "imagen_url", "orden"] },
];
const ORDEN_ITEMS = [
  [{ model: PaqueteItem, as: "items" }, "dia", "ASC"],
  [{ model: PaqueteItem, as: "items" }, "orden", "ASC"],
  [{ model: ImagenPaquete, as: "imagenes" }, "orden", "ASC"],
];

// Agrega precio_suelto (suma de los servicios por separado) y ahorro respecto al precio del paquete.
function conAhorro(paquete) {
  const p = paquete.toJSON();
  p.precio_suelto = (p.items || []).reduce((s, i) => s + Number(i.sitio?.precio || 0), 0);
  p.ahorro = Math.max(0, p.precio_suelto - Number(p.precio));
  return p;
}

async function prestadorAprobado(usuario_id) {
  const prestador = await prestadorDeUsuario(usuario_id);
  if (!prestador) throw new ErrorHttp(400, "Aún no has creado tu perfil de negocio.");
  if (prestador.estado_verificacion !== "aprobado") throw new ErrorHttp(400, "Tu negocio debe estar aprobado para crear paquetes.");
  return prestador;
}

// Todos los servicios deben ser del prestador y estar activos; no se repiten.
async function validarServicios(prestador, sitios) {
  const ids = sitios.map((s) => s.sitio_id);
  if (new Set(ids).size !== ids.length) throw new ErrorHttp(400, "No repitas un mismo servicio dentro del paquete.");
  const encontrados = await SitioTuristico.findAll({ where: { id: ids } });
  if (encontrados.length !== ids.length) throw new ErrorHttp(400, "Alguno de los servicios no existe.");
  for (const s of encontrados) {
    politicas.catalogo.exigirServicioDelNegocio(s, prestador);
    if (s.estado !== "activo") throw new ErrorHttp(400, `El servicio "${s.nombre}" no está activo. Actívalo o quítalo del paquete.`);
  }
}

async function guardarItems(paquete_id, sitios, transaction) {
  await PaqueteItem.destroy({ where: { paquete_id }, transaction });
  await PaqueteItem.bulkCreate(
    sitios.map((s, i) => ({ paquete_id, sitio_id: s.sitio_id, dia: s.dia || 1, orden: i })),
    { transaction }
  );
}

async function crearPaquete({ usuario_id, datos }) {
  const prestador = await prestadorAprobado(usuario_id);
  await validarServicios(prestador, datos.sitios);
  const id = await sequelize.transaction(async (transaction) => {
    const paquete = await Paquete.create({
      prestador_id: prestador.id, nombre: datos.nombre, descripcion: datos.descripcion || null,
      precio: datos.precio, capacidad: datos.capacidad || null, imagen_url: datos.imagen_url || null,
      ...(datos.politica_cancelacion ? { politica_cancelacion: datos.politica_cancelacion } : {}),
    }, { transaction });
    await guardarItems(paquete.id, datos.sitios, transaction);
    return paquete.id;
  });
  return obtenerPaquete(id);
}

async function paqueteDelPrestador(id, usuario_id) {
  const paquete = await Paquete.unscoped().findByPk(id); // unscoped: al dueño se le explica el motivo si el administrador lo ocultó
  if (!paquete || paquete.estado === "archivado") throw new ErrorHttp(400, "Paquete no encontrado.");
  const prestador = await prestadorDeUsuario(usuario_id);
  politicas.catalogo.exigirEditarPaquete(prestador, paquete); // RN-07
  return { paquete, prestador };
}

async function actualizarPaquete({ id, usuario_id, datos }) {
  const { paquete, prestador } = await paqueteDelPrestador(id, usuario_id);
  await validarServicios(prestador, datos.sitios);
  const imagenAnterior = paquete.imagen_url;
  await sequelize.transaction(async (transaction) => {
    await paquete.update({
      nombre: datos.nombre, descripcion: datos.descripcion || null, precio: datos.precio,
      capacidad: datos.capacidad || null,
      ...(datos.politica_cancelacion ? { politica_cancelacion: datos.politica_cancelacion } : {}), // si no se envía, se conserva
      // un paquete oculto por el administrador no lo reactiva el prestador
      ...(datos.estado && paquete.estado !== "oculto" ? { estado: datos.estado } : {}),
      ...(datos.imagen_url ? { imagen_url: datos.imagen_url } : {}),
    }, { transaction });
    await guardarItems(paquete.id, datos.sitios, transaction);
  });
  if (datos.imagen_url) eliminarArchivoSubido(imagenAnterior);
  return obtenerPaquete(id);
}

async function cambiarEstado({ id, usuario_id, estado }) {
  const { paquete } = await paqueteDelPrestador(id, usuario_id);
  if (paquete.estado === "oculto") {
    throw new ErrorHttp(400, `El administrador ocultó este paquete${paquete.motivo_moderacion ? `: ${paquete.motivo_moderacion}` : ""}. Corrígelo y contacta al equipo de PubliTours.`);
  }
  await paquete.update({ estado });
  return obtenerPaquete(id);
}

// Se archiva (no se borra) para conservar el historial; se bloquea si hay reservas pendientes o próximas.
async function archivarPaquete({ id, usuario_id }) {
  const { paquete } = await paqueteDelPrestador(id, usuario_id);
  const pendientes = await Reserva.count({
    where: {
      paquete_id: paquete.id,
      [Op.or]: [{ estado: "pendiente" }, { estado: "confirmada", fecha_servicio: { [Op.gte]: hoyLocal() } }],
    },
  });
  if (pendientes > 0) {
    throw new ErrorHttp(400, `No puedes eliminar este paquete: tiene ${pendientes} reserva(s) pendiente(s) o próximas. Atiéndelas primero, o pausa el paquete.`);
  }
  await paquete.update({ estado: "archivado" });
}

// Agrega fotos a la galería propia del paquete (máximo ${MAX_FOTOS_GALERIA}); si falla, borra los archivos recién subidos.
async function agregarImagenes({ id, usuario_id, archivos }) {
  try {
    const { paquete } = await paqueteDelPrestador(id, usuario_id);
    if (!archivos || archivos.length === 0) throw new ErrorHttp(400, "Debes adjuntar al menos una imagen.");
    const existentes = await ImagenPaquete.count({ where: { paquete_id: paquete.id } });
    if (existentes + archivos.length > MAX_FOTOS_GALERIA) {
      throw new ErrorHttp(400, `La galería admite máximo ${MAX_FOTOS_GALERIA} fotos (ya tiene ${existentes}).`);
    }
    return await Promise.all(archivos.map((f, i) =>
      ImagenPaquete.create({ paquete_id: paquete.id, imagen_url: `/uploads/sitios/${f.filename}`, orden: existentes + i })
    ));
  } catch (err) {
    (archivos || []).forEach((f) => eliminarArchivoSubido(`/uploads/sitios/${f.filename}`));
    throw err;
  }
}

async function eliminarImagen({ id, usuario_id, imagenId }) {
  const { paquete } = await paqueteDelPrestador(id, usuario_id);
  const imagen = await ImagenPaquete.findByPk(imagenId);
  if (!imagen || imagen.paquete_id !== paquete.id) throw new ErrorHttp(400, "Imagen no encontrada.");
  eliminarArchivoSubido(imagen.imagen_url);
  await imagen.destroy();
}

async function obtenerPaquete(id) {
  const paquete = await Paquete.findByPk(id, { include: INCLUDE_ITEMS, order: ORDEN_ITEMS });
  if (!paquete) return null;
  const [conResumen] = await adjuntarResumen([conAhorro(paquete)], "paquete_id");
  return conResumen;
}

// Tope de paquetes públicos por respuesta (los más recientes); el filtro de visibilidad se hace en SQL antes de limitar.
const LIMITE_PUBLICOS = 200;

// Detalle público: los archivados, los ocultos por moderación y los de un negocio suspendido o rechazado no existen para el público,
// y el motivo de moderación (interno) nunca se devuelve.
async function obtenerPublico(id) {
  const paquete = await obtenerPaquete(id);
  const publico = paquete && paquete.estado !== "archivado" && paquete.estado !== "oculto" && (await prestadorOperativo(paquete.prestador_id));
  if (!publico) throw new ErrorHttp(404, "Paquete no encontrado.");
  const { motivo_moderacion: _interno, ...resto } = paquete;
  return resto;
}

async function listarPublicos({ texto, prestador_id } = {}) {
  const condiciones = [paqueteVisibleSql()];
  const where = { estado: "activo", [Op.and]: condiciones };
  if (prestador_id) where.prestador_id = prestador_id;
  if (texto) where[Op.or] = [{ nombre: { [Op.iLike]: `%${texto}%` } }, { descripcion: { [Op.iLike]: `%${texto}%` } }];
  const paquetes = await Paquete.findAll({
    where, include: INCLUDE_ITEMS, order: [["id", "DESC"], ...ORDEN_ITEMS], limit: LIMITE_PUBLICOS, subQuery: false,
  });
  return adjuntarResumen(paquetes.map(conAhorro), "paquete_id");
}

async function listarDelPrestador(usuario_id) {
  const prestador = await prestadorDeUsuario(usuario_id);
  if (!prestador) throw new ErrorHttp(400, "Aún no has creado tu perfil de negocio.");
  const paquetes = await Paquete.unscoped().findAll({ // unscoped: el negocio dueño ve el motivo si ocultaron su paquete
    where: { prestador_id: prestador.id, estado: { [Op.ne]: "archivado" } },
    include: INCLUDE_ITEMS, order: [["id", "DESC"], ...ORDEN_ITEMS],
  });
  return adjuntarResumen(paquetes.map(conAhorro), "paquete_id");
}

// Un día bloqueado en cualquiera de los servicios del paquete bloquea el paquete.
async function fechasBloqueadasDelPaquete(id) {
  const items = await PaqueteItem.findAll({ where: { paquete_id: id }, attributes: ["sitio_id"], raw: true });
  if (items.length === 0) return [];
  const fechas = await FechaBloqueada.findAll({
    where: { sitio_id: items.map((i) => i.sitio_id), fecha: { [Op.gte]: hoyLocal() } },
    order: [["fecha", "ASC"]],
  });
  const vistas = new Set();
  return fechas.filter((f) => !vistas.has(f.fecha) && vistas.add(f.fecha)).map((f) => ({ id: f.id, fecha: f.fecha, motivo: f.motivo }));
}

module.exports = {
  agregarImagenes, eliminarImagen, crearPaquete, actualizarPaquete, cambiarEstado, archivarPaquete, obtenerPaquete,
  obtenerPublico, listarPublicos, listarDelPrestador, fechasBloqueadasDelPaquete,
};
