const { Op, literal } = require("sequelize");
const { SitioTuristico, Prestador, ImagenSitio, Reserva, FechaBloqueada, Paquete, PaqueteItem, TarifaTemporada } = require("../models");
const { adjuntarResumen } = require("./resenaService");
const { cotizar } = require("./precioService");
const disponibilidad = require("./disponibilidadService");
const { ErrorHttp } = require("../utils/errores");
const { eliminarArchivoSubido } = require("../utils/archivos");
const { sitioVisibleSql, prestadorOperativo } = require("./visibilidad");
const { hoyLocal, esFechaReal, mesValidoOActual } = require("../utils/fechas");
const { prestadorDeUsuario } = require("./negocioPropio");
const politicas = require("../politicas");


// Promedio de calificaciones de un servicio como subconsulta (los servicios sin reseñas cuentan 0).
const PROMEDIO_SQL = `COALESCE((SELECT AVG(r.calificacion) FROM resenas r WHERE r.sitio_id = "SitioTuristico"."id"), 0)`;

// Disponibilidad de un servicio en una fecha (mismas reglas que al reservar y al confirmar): no bloqueado y con cupo.
// `f` ya viene validada con FECHA_ISO, por lo que es seguro incrustarla.
const disponibleEn = (f) => `
  NOT EXISTS (SELECT 1 FROM fechas_bloqueadas fb WHERE fb.sitio_id = "SitioTuristico"."id" AND fb.fecha = '${f}')
  AND (CASE WHEN "SitioTuristico"."capacidad" IS NULL
       THEN NOT EXISTS (SELECT 1 FROM reservas rv WHERE rv.sitio_id = "SitioTuristico"."id" AND rv.paquete_id IS NULL AND rv.estado = 'confirmada' AND rv.fecha_servicio = '${f}')
       ELSE COALESCE((SELECT SUM(rv.personas) FROM reservas rv WHERE rv.sitio_id = "SitioTuristico"."id" AND rv.paquete_id IS NULL AND rv.estado = 'confirmada' AND rv.fecha_servicio = '${f}'), 0) < "SitioTuristico"."capacidad"
       END)`;

// Distancia en km (fórmula de Haversine) desde la ubicación del turista; los servicios sin coordenadas dan NULL
// (LEAST ignora NULL en PostgreSQL, por eso se anula explícitamente).
const distanciaSql = (lat, lng) =>
  `CASE WHEN "SitioTuristico"."latitud" IS NULL OR "SitioTuristico"."longitud" IS NULL THEN NULL ELSE 6371 * acos(LEAST(1, cos(radians(${lat})) * cos(radians("SitioTuristico"."latitud")) * cos(radians("SitioTuristico"."longitud") - radians(${lng})) + sin(radians(${lat})) * sin(radians("SitioTuristico"."latitud")))) END`;

// Tope de personas por consulta de precio: coincide con el máximo que acepta una reserva.
const LIMITE_PERSONAS = 500;

const ORDEN_PERMITIDO = {
  relevancia: [["nombre", "ASC"]],
  precio_asc: [["precio", "ASC"]],
  precio_desc: [["precio", "DESC"]],
  nombre: [["nombre", "ASC"]],
};

// RF-04/RF-05/RF-06: búsqueda por texto, filtros avanzados, orden y paginación.
async function buscar({ texto, municipio, categoria, presupuesto_max, tipo_viaje, orden, page, limit, lat, lng, calificacion_min, fecha }) {
  const where = { estado: "activo" };
  const condiciones = [sitioVisibleSql()]; // solo servicios de negocios operativos

  if (municipio) where.municipio = municipio;
  if (categoria) where.categoria = categoria;
  if (presupuesto_max !== undefined && presupuesto_max !== "" && Number.isFinite(Number(presupuesto_max)) && Number(presupuesto_max) >= 0) where.precio = { [Op.lte]: Number(presupuesto_max) }; // un valor que no es número se ignora
  if (tipo_viaje) where.tipo_viaje = { [Op.iLike]: `%${tipo_viaje}%` };
  if (texto) {
    where[Op.or] = [
      { nombre: { [Op.iLike]: `%${texto}%` } },
      { descripcion: { [Op.iLike]: `%${texto}%` } },
      { categoria: { [Op.iLike]: `%${texto}%` } },
    ];
  }

  // Calificación mínima (1 a 5) y disponibilidad en una fecha futura; valores inválidos se ignoran.
  const minimo = Number(calificacion_min);
  if (calificacion_min && Number.isFinite(minimo) && minimo >= 1 && minimo <= 5) {
    condiciones.push(literal(`${PROMEDIO_SQL} >= ${minimo}`));
  }
  if (esFechaReal(fecha) && fecha > hoyLocal()) condiciones.push(literal(disponibleEn(fecha)));
  where[Op.and] = condiciones;

  const pageNum = Math.max(1, parseInt(page, 10) || 1);
  const limitNum = Math.min(50, Math.max(1, parseInt(limit, 10) || 10));
  let order = ORDEN_PERMITIDO[Object.hasOwn(ORDEN_PERMITIDO, orden) ? orden : "relevancia"];
  if (orden === "calificacion") order = [[literal(`${PROMEDIO_SQL} DESC, "SitioTuristico"."nombre"`), "ASC"]];

  const latN = Number(lat), lngN = Number(lng);
  const conUbicacion = lat !== undefined && lng !== undefined && lat !== "" && lng !== "" && Number.isFinite(latN) && Number.isFinite(lngN);
  const distancia = conUbicacion ? distanciaSql(latN, lngN) : null;
  if (conUbicacion && orden === "cercania") order = [[literal(`${distancia} ASC NULLS LAST, "SitioTuristico"."nombre"`), "ASC"]];

  const { count, rows } = await SitioTuristico.findAndCountAll({
    where, order,
    attributes: {
      include: [
        [literal(`EXISTS (SELECT 1 FROM tarifas_temporada t WHERE t.sitio_id = "SitioTuristico"."id")`), "tiene_temporadas"],
        ...(conUbicacion ? [[literal(distancia), "distancia_km"]] : []),
      ],
    },
    limit: limitNum,
    offset: (pageNum - 1) * limitNum,
  });

  return {
    total: count,
    page: pageNum,
    limit: limitNum,
    total_paginas: Math.ceil(count / limitNum),
    resultados: await adjuntarResumen(rows.map((r) => r.toJSON())),
  };
}

// Detalle público de un servicio. Los archivados, los ocultos por moderación y los de un negocio suspendido o rechazado no existen
// para el público; el motivo de moderación es interno y nunca se devuelve.
async function obtenerDetalle(id) {
  const sitio = await SitioTuristico.findByPk(id, {
    attributes: { exclude: ["motivo_moderacion"] },
    include: [
      { model: Prestador, attributes: ["id", "nombre_negocio", "municipio", "estado_verificacion", "telefono"] },
      { model: ImagenSitio, as: "imagenes", attributes: ["id", "imagen_url", "orden"], separate: true, order: [["orden", "ASC"]] },
      { model: TarifaTemporada, as: "tarifas", separate: true, order: [["fecha_desde", "ASC"]] },
    ],
  });
  const oculto = !sitio || sitio.estado === "archivado" || sitio.estado === "oculto";
  if (oculto || (sitio.prestador_id && !(await prestadorOperativo(sitio.prestador_id)))) throw new ErrorHttp(404, "Sitio no encontrado.");
  const [conResumen] = await adjuntarResumen([sitio.toJSON()]);
  return conResumen;
}

// RN-07: un servicio solo lo gestiona su negocio (el administrador modera por sus propias rutas, no lo edita). La política decide.
async function sitioPropio(id, usuario) {
  const sitio = await SitioTuristico.findByPk(id);
  if (!sitio) throw new ErrorHttp(404, "Sitio no encontrado.");
  const negocio = sitio.prestador_id ? await Prestador.findByPk(sitio.prestador_id) : null;
  politicas.catalogo.exigirEditarServicio(usuario, negocio);
  return sitio;
}

// Reemplaza las temporadas de un servicio por las recibidas (undefined = no tocar; [] = quitarlas todas).
async function reemplazarTarifas(sitio_id, temporadas) {
  if (temporadas === undefined) return;
  await TarifaTemporada.destroy({ where: { sitio_id } });
  if (temporadas.length > 0) {
    await TarifaTemporada.bulkCreate(temporadas.map((t) => ({
      sitio_id, nombre: t.nombre, fecha_desde: t.fecha_desde, fecha_hasta: t.fecha_hasta, precio: t.precio, precio_nino: t.precio_nino ?? null,
    })));
  }
}

// Evita borrar del disco un archivo que la portada comparte con una foto de la galería
// (ocurre porque al subir la primera foto de galería esta también se usa como portada).
async function eliminarArchivoImagenSiNoEstaEnGaleria(imagen_url, sitio_id) {
  if (!imagen_url) return;
  const enGaleria = await ImagenSitio.count({ where: { sitio_id, imagen_url } });
  if (enGaleria === 0) eliminarArchivoSubido(imagen_url);
}

// RF-04: crear un sitio/servicio en el catálogo.
async function crear({ datos, archivo, usuario }) {
  const { nombre, categoria, municipio, precio, horario, descripcion, prestador_id, tipo_viaje, latitud, longitud, capacidad, politica_cancelacion, precio_nino, grupo_min_personas, grupo_descuento_pct, temporadas } = datos;
  if (!nombre || !categoria || !municipio) throw new ErrorHttp(400, "nombre, categoria y municipio son obligatorios.");

  // Se publica siempre a nombre del negocio de quien lo hace: no se puede dejar sin negocio ni usar el de otra persona.
  if (prestador_id) {
    const indicado = await Prestador.findByPk(prestador_id);
    if (!indicado) throw new ErrorHttp(404, "Prestador no encontrado.");
    politicas.catalogo.exigirPublicarComo(usuario, indicado);
  }
  const negocio = await prestadorDeUsuario(usuario.id);
  if (!negocio) throw new ErrorHttp(400, "Aún no has creado tu perfil de negocio.");
  // RN-01: el negocio debe estar verificado y aprobado antes de publicar en el catálogo.
  if (negocio.estado_verificacion !== "aprobado") {
    throw new ErrorHttp(403, "El prestador debe estar verificado y aprobado antes de publicar en el catálogo.");
  }

  const sitio = await SitioTuristico.create({
    nombre, categoria, municipio, precio: precio || 0, horario, descripcion, tipo_viaje,
    imagen_url: archivo ? `/uploads/sitios/${archivo.filename}` : null,
    latitud: latitud || null, longitud: longitud || null, capacidad: capacidad || null, prestador_id: negocio.id,
    precio_nino: precio_nino ?? null, grupo_min_personas: grupo_min_personas || null, grupo_descuento_pct: grupo_descuento_pct || null,
    ...(politica_cancelacion ? { politica_cancelacion } : {}),
  });
  await reemplazarTarifas(sitio.id, temporadas);
  return sitio;
}

// RF-04: actualizar un sitio existente.
async function actualizar({ id, datos, archivo, usuario }) {
  const sitio = await sitioPropio(id, usuario);
  const { nombre, categoria, municipio, precio, horario, descripcion, estado, tipo_viaje, latitud, longitud, capacidad, politica_cancelacion, precio_nino, grupo_min_personas, grupo_descuento_pct, temporadas } = datos;
  const cambios = {
    ...(politica_cancelacion ? { politica_cancelacion } : {}), // si no se envía, se conserva la actual
    nombre, categoria, municipio, precio, horario, descripcion,
    estado: sitio.estado === "oculto" ? "oculto" : estado, // moderación: solo el administrador la revierte, por su ruta
    tipo_viaje,
    capacidad: capacidad === "" || capacidad === undefined ? null : capacidad,
    precio_nino: precio_nino === undefined ? null : precio_nino,
    grupo_min_personas: grupo_min_personas || null,
    grupo_descuento_pct: grupo_descuento_pct || null,
    latitud: latitud === "" ? null : latitud, longitud: longitud === "" ? null : longitud,
  };
  if (archivo) {
    await eliminarArchivoImagenSiNoEstaEnGaleria(sitio.imagen_url, sitio.id);
    cambios.imagen_url = `/uploads/sitios/${archivo.filename}`;
  }
  await sitio.update(cambios);
  await reemplazarTarifas(sitio.id, temporadas);
  return sitio;
}

// RF-04: eliminar un sitio. Se archiva (no se borra) para conservar el historial de reservas y reseñas.
async function eliminar({ id, usuario }) {
  const sitio = await sitioPropio(id, usuario);

  const enPaquetes = await PaqueteItem.findAll({
    where: { sitio_id: sitio.id },
    include: [{ model: Paquete, where: { estado: { [Op.ne]: "archivado" } }, attributes: ["nombre"] }],
  });
  if (enPaquetes.length > 0) {
    throw new ErrorHttp(400, `No puedes eliminar este servicio: forma parte de los paquetes ${enPaquetes.map((i) => `"${i.Paquete.nombre}"`).join(", ")}. Quítalo de esos paquetes primero.`);
  }

  const pendientes = await Reserva.count({
    where: {
      sitio_id: sitio.id,
      [Op.or]: [{ estado: "pendiente" }, { estado: "confirmada", fecha_servicio: { [Op.gte]: hoyLocal() } }],
    },
  });
  if (pendientes > 0) {
    throw new ErrorHttp(400, `No puedes eliminar este servicio: tiene ${pendientes} reserva(s) pendiente(s) o próximas. Atiéndelas primero, o pausa el servicio para que no reciba nuevas.`);
  }
  await sitio.update({ estado: "archivado" });
}

// Cotización pública: cuánto costaría para una fecha y un grupo (temporada, niños y descuento por grupo incluidos).
async function cotizarServicio(id, { fecha, personas, ninos }) {
  const sitio = await SitioTuristico.findByPk(id);
  if (!sitio || sitio.estado === "archivado") throw new ErrorHttp(404, "Sitio no encontrado.");
  return cotizar(sitio, {
    fecha: esFechaReal(fecha) ? fecha : hoyLocal(),
    personas: Math.min(LIMITE_PERSONAS, Math.max(1, parseInt(personas, 10) || 1)),
    ninos: Math.min(LIMITE_PERSONAS, Math.max(0, parseInt(ninos, 10) || 0)),
  });
}

// Calendario del mes con la disponibilidad de cada día.
async function calendario(id, mes) {
  const datos = await disponibilidad.calendario({
    tipo: "sitio", id,
    mes: mesValidoOActual(mes),
  });
  if (!datos) throw new ErrorHttp(404, "Sitio no encontrado.");
  return datos;
}

// Fechas en las que el prestador no atiende (público: el turista las ve al elegir fecha).
function fechasBloqueadas(sitio_id) {
  return FechaBloqueada.findAll({ where: { sitio_id, fecha: { [Op.gte]: hoyLocal() } }, order: [["fecha", "ASC"]] });
}

async function bloquearFecha({ id, usuario, fecha, motivo }) {
  const sitio = await sitioPropio(id, usuario);
  const [bloqueo] = await FechaBloqueada.findOrCreate({ where: { sitio_id: sitio.id, fecha }, defaults: { motivo: motivo || null } });
  return bloqueo;
}

async function desbloquearFecha({ id, usuario, fechaId }) {
  const sitio = await sitioPropio(id, usuario);
  await FechaBloqueada.destroy({ where: { id: fechaId, sitio_id: sitio.id } });
}

// RF-04: agregar una o varias fotos a la galería del sitio.
async function agregarImagenes({ id, usuario, archivos }) {
  const sitio = await sitioPropio(id, usuario);
  if (!archivos || archivos.length === 0) throw new ErrorHttp(400, "Debe adjuntar al menos una imagen.");

  const existentes = await ImagenSitio.count({ where: { sitio_id: sitio.id } });
  const nuevas = await Promise.all(
    archivos.map((file, i) => ImagenSitio.create({ sitio_id: sitio.id, imagen_url: `/uploads/sitios/${file.filename}`, orden: existentes + i }))
  );
  // Si el sitio aún no tiene foto de portada, se usa la primera imagen subida.
  if (!sitio.imagen_url) await sitio.update({ imagen_url: nuevas[0].imagen_url });
  return nuevas;
}

// RF-04: eliminar una foto de la galería.
async function eliminarImagen({ id, usuario, imagenId }) {
  const sitio = await sitioPropio(id, usuario);
  const imagen = await ImagenSitio.findByPk(imagenId);
  if (!imagen || imagen.sitio_id !== sitio.id) throw new ErrorHttp(404, "Imagen no encontrada.");

  eliminarArchivoSubido(imagen.imagen_url);
  await imagen.destroy();

  // Si era la foto de portada, se reemplaza por la siguiente disponible (o se deja sin portada).
  if (sitio.imagen_url === imagen.imagen_url) {
    const siguiente = await ImagenSitio.findOne({ where: { sitio_id: sitio.id }, order: [["orden", "ASC"]] });
    await sitio.update({ imagen_url: siguiente ? siguiente.imagen_url : null });
  }
}

module.exports = { buscar, obtenerDetalle, crear, actualizar, eliminar, cotizarServicio, calendario, fechasBloqueadas, bloquearFecha, desbloquearFecha, agregarImagenes, eliminarImagen };
