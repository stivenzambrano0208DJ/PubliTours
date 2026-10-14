const crypto = require("crypto");
const { Op } = require("sequelize");
const { SitioTuristico, Itinerario, ItinerarioItem, FechaBloqueada } = require("../models");
const { hoyLocal, fechaDelDia } = require("../utils/fechas");
const { ErrorHttp } = require("../utils/errores");
const { sitioVisibleSql } = require("./visibilidad");
const politicas = require("../politicas");
const { prestadorDeUsuario } = require("./negocioPropio");

const ITEMS_POR_DIA_MAX = 2;

// RN-02/RF-10: el scoring solo puede operar sobre sitios activos ya existentes en la base de datos verificada.
// Si quien solicita el itinerario es también prestador, se excluyen sus propios sitios (no puede recomendarse a sí mismo).
async function obtenerCandidatos({ municipio, categoria, prestadorPropioId }) {
  const where = { estado: "activo", [Op.and]: [sitioVisibleSql()] }; // solo servicios de negocios operativos
  if (municipio) where.municipio = municipio;
  if (categoria) where.categoria = categoria;
  if (prestadorPropioId) {
    where[Op.or] = [{ prestador_id: { [Op.ne]: prestadorPropioId } }, { prestador_id: null }];
  }
  // Se incluyen todos los precios; el filtrado fino por presupuesto ocurre en la asignación por día,
  // ya que un solo ítem no debe descartarse aquí si aún podría encajar en el presupuesto total.
  return SitioTuristico.findAll({ where });
}

// Calcula el puntaje de un sitio frente a las preferencias del turista.
// RN-06: en igualdad de condiciones, prioriza sitios con información más completa.
function calcularScore(sitio, { preferenciasTags, presupuestoPorDia }) {
  let score = 0;
  const detalles = [];

  const tagsSitio = (sitio.tipo_viaje || "").split(",").map((t) => t.trim().toLowerCase()).filter(Boolean);
  const coincidencias = preferenciasTags.filter((t) => tagsSitio.includes(t));

  if (coincidencias.length > 0) {
    score += 30 + Math.min(coincidencias.length - 1, 2) * 10; // 30 por la primera, +10 por cada adicional (máx 2 extra)
    detalles.push(`coincide con tus intereses: ${coincidencias.join(", ")}`);
  }

  const precio = Number(sitio.precio);
  if (precio === 0) {
    score += 15;
    detalles.push("es una actividad gratuita");
  } else if (precio <= presupuestoPorDia) {
    score += 20;
    detalles.push("se ajusta a tu presupuesto diario");
  } else {
    score -= 15; // penaliza fuertemente lo que excede el presupuesto diario estimado
  }

  if (sitio.descripcion) score += 5;
  if (sitio.horario) score += 5;

  return { score: Math.max(0, Math.round(score * 100) / 100), detalles };
}

function construirJustificacion(detalles) {
  if (detalles.length === 0) return "Incluido para completar tu itinerario dentro de las opciones disponibles.";
  const frase = detalles.join(" y ");
  return `Se incluyó porque ${frase}.`;
}

// RF-07/RF-08: genera un itinerario ordenado por día a partir de presupuesto, duración y preferencias.
// RF-10: nunca genera sitios fuera de la base de datos verificada; solo ordena y selecciona entre los existentes.
async function generarItinerario({ turista_id, presupuesto, dias, preferencias, municipio, categoria, personas = 1, fecha_inicio = null }) {
  if (fecha_inicio && fecha_inicio <= hoyLocal()) {
    throw new ErrorHttp(400, "La fecha de inicio debe ser posterior a hoy.");
  }
  if (!presupuesto || presupuesto <= 0) throw new ErrorHttp(400, "El presupuesto debe ser mayor a cero.");
  if (!dias || dias <= 0) throw new ErrorHttp(400, "La cantidad de días debe ser mayor a cero.");

  const preferenciasTags = (preferencias || "")
    .toLowerCase()
    .split(/[,\s]+/)
    .filter(Boolean);

  // Si el turista solicitante también es dueño de un negocio, excluye ese negocio de sus propias recomendaciones.
  const prestadorPropio = await prestadorDeUsuario(turista_id);

  // El presupuesto es del grupo: cada servicio cuesta su precio por el número de personas.
  const presupuestoPorDia = presupuesto / dias / personas;
  const candidatos = await obtenerCandidatos({ municipio, categoria, prestadorPropioId: prestadorPropio?.id });

  if (candidatos.length === 0) {
    throw new ErrorHttp(400, "No hay suficientes sitios disponibles en el catálogo para generar un itinerario con esos criterios.");
  }

  const puntuados = candidatos
    .map((sitio) => ({ sitio, ...calcularScore(sitio, { preferenciasTags, presupuestoPorDia }) }))
    .sort((a, b) => b.score - a.score);

  // Con fecha de inicio, un servicio no se programa en un día que el prestador tiene bloqueado.
  const bloqueos = new Map(); // sitio_id -> Set de fechas
  if (fecha_inicio) {
    const filas = await FechaBloqueada.findAll({
      where: { sitio_id: puntuados.map((p) => p.sitio.id), fecha: { [Op.between]: [fechaDelDia(fecha_inicio, 1), fechaDelDia(fecha_inicio, dias)] } },
      attributes: ["sitio_id", "fecha"], raw: true,
    });
    filas.forEach((f) => { if (!bloqueos.has(f.sitio_id)) bloqueos.set(f.sitio_id, new Set()); bloqueos.get(f.sitio_id).add(f.fecha); });
  }

  const itinerario = await Itinerario.create({
    turista_id, presupuesto, dias, personas, fecha_inicio, preferencias: preferencias || null,
  });

  let presupuestoRestante = Number(presupuesto);
  const itemsPorDia = Array.from({ length: dias }, () => 0);
  const itemsCreados = [];
  let diaActual = 0;
  let intentos = 0;

  for (const candidato of puntuados) {
    if (itemsCreados.length >= dias * ITEMS_POR_DIA_MAX) break;
    if (intentos > puntuados.length * 2) break;
    intentos++;

    const precio = Number(candidato.sitio.precio) * personas;
    if (precio > presupuestoRestante) continue; // RN-05: no exceder el presupuesto declarado
    if (candidato.sitio.capacidad && personas > candidato.sitio.capacidad) continue; // el grupo no cabe en el cupo

    // Busca el próximo día que aún no alcanzó el máximo de ítems (round-robin).
    let dIni = diaActual;
    let asignado = false;
    for (let i = 0; i < dias; i++) {
      const d = (dIni + i) % dias;
      const bloqueado = fecha_inicio && bloqueos.get(candidato.sitio.id)?.has(fechaDelDia(fecha_inicio, d + 1));
      if (itemsPorDia[d] < ITEMS_POR_DIA_MAX && !bloqueado) {
        const item = await ItinerarioItem.create({
          itinerario_id: itinerario.id,
          sitio_id: candidato.sitio.id,
          dia: d + 1,
          orden: itemsPorDia[d] + 1,
          score: candidato.score,
          justificacion: construirJustificacion(candidato.detalles),
        });
        itemsPorDia[d]++;
        presupuestoRestante -= precio;
        diaActual = (d + 1) % dias;
        itemsCreados.push(item);
        asignado = true;
        break;
      }
    }
    if (!asignado && itemsCreados.length >= dias * ITEMS_POR_DIA_MAX) break; // todos los días llenos
  }

  if (itemsCreados.length === 0) {
    throw new ErrorHttp(400, "No fue posible construir un itinerario dentro del presupuesto indicado. Intenta ampliarlo.");
  }

  return obtenerItinerarioCompleto(itinerario.id);
}

async function obtenerItinerarioCompleto(id) {
  const itinerario = await Itinerario.findByPk(id, {
    include: [{
      model: ItinerarioItem,
      as: "items",
      include: [{ model: SitioTuristico, as: "sitio" }],
      order: [["dia", "ASC"], ["orden", "ASC"]],
    }],
  });
  return itinerario;
}

// RN-07: un turista solo puede consultar sus propios itinerarios (el administrador, todos).
async function obtenerItinerarioDe(id, usuario) {
  const itinerario = await obtenerItinerarioCompleto(id);
  if (!itinerario) throw new ErrorHttp(404, "Itinerario no encontrado.");
  politicas.itinerarios.exigirVerItinerario(usuario, itinerario);
  return itinerario;
}

async function listarItinerariosTurista(turista_id) {
  return Itinerario.findAll({
    where: { turista_id },
    include: [{ model: ItinerarioItem, as: "items", include: [{ model: SitioTuristico, as: "sitio" }] }],
    order: [["fecha_creacion", "DESC"], [{ model: ItinerarioItem, as: "items" }, "dia", "ASC"], [{ model: ItinerarioItem, as: "items" }, "orden", "ASC"]],
  });
}

// ---------------- Enlace público de solo lectura ----------------
const FORMATO_TOKEN = /^[A-Za-z0-9_-]{16,64}$/;

async function itinerarioPropio(id, turista_id) {
  const itinerario = await Itinerario.findByPk(id);
  if (!itinerario) throw new ErrorHttp(404, "Itinerario no encontrado.");
  politicas.itinerarios.exigirCompartirItinerario(turista_id, itinerario);
  return itinerario;
}

// Crea el enlace (o devuelve el que ya existe: compartir dos veces no cambia la dirección). Solo el dueño.
async function compartirItinerario({ id, turista_id }) {
  const itinerario = await itinerarioPropio(id, turista_id);
  if (!itinerario.token_publico) await itinerario.update({ token_publico: crypto.randomBytes(18).toString("base64url") });
  return { token: itinerario.token_publico };
}

// Revoca el enlace: la dirección anterior deja de funcionar. Solo el dueño; repetirlo no da error.
async function dejarDeCompartirItinerario({ id, turista_id }) {
  const itinerario = await itinerarioPropio(id, turista_id);
  if (itinerario.token_publico) await itinerario.update({ token_publico: null });
}

// Lo que ve quien abre el enlace. Es público: nada de datos de la persona ni de su presupuesto, solo el plan, y únicamente
// con servicios que hoy también son públicos (si un negocio se suspendió o un servicio se ocultó, desaparece del plan).
async function obtenerItinerarioCompartido(token) {
  if (!FORMATO_TOKEN.test(String(token))) throw new ErrorHttp(404, "Este itinerario no existe o ya no se comparte.");
  const itinerario = await Itinerario.findOne({
    where: { token_publico: token },
    include: [{
      model: ItinerarioItem,
      as: "items",
      include: [{
        model: SitioTuristico, as: "sitio", required: true,
        where: { estado: "activo", [Op.and]: [sitioVisibleSql("items->sitio")] },
        attributes: ["id", "nombre", "descripcion", "categoria", "municipio", "precio", "imagen_url", "latitud", "longitud"],
      }],
    }],
    order: [[{ model: ItinerarioItem, as: "items" }, "dia", "ASC"], [{ model: ItinerarioItem, as: "items" }, "orden", "ASC"]],
  });
  if (!itinerario) throw new ErrorHttp(404, "Este itinerario no existe o ya no se comparte.");
  return {
    dias: itinerario.dias,
    fecha_inicio: itinerario.fecha_inicio,
    personas: itinerario.personas,
    items: itinerario.items.map((i) => ({ id: i.id, dia: i.dia, orden: i.orden, justificacion: i.justificacion, sitio: i.sitio })),
  };
}

module.exports = {
  listarItinerariosTurista, generarItinerario, obtenerItinerarioDe, calcularScore,
  compartirItinerario, dejarDeCompartirItinerario, obtenerItinerarioCompartido,
};
