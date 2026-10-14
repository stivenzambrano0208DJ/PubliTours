const itinerarioService = require("../services/itinerarioService");
const logger = require("../utils/logger");
const { ErrorHttp } = require("../utils/errores");
const iaService = require("../services/iaService");

// RF-07/RF-08/RF-09(parcial)/RF-10: genera un itinerario a partir de presupuesto, días y preferencias.
async function generar(req, res) {
  const { presupuesto, dias, preferencias, municipio, categoria, personas, fecha_inicio } = req.body;
  const itinerario = await itinerarioService.generarItinerario({
    turista_id: req.usuario.id,
    presupuesto: Number(presupuesto),
    dias: Number(dias),
    preferencias,
    municipio,
    categoria,
    personas,
    fecha_inicio,
  });
  return res.status(201).json(itinerario);
}

async function misItinerarios(req, res) {
  return res.json(await itinerarioService.listarItinerariosTurista(req.usuario.id));
}

// Lenguaje natural -> parámetros del formulario. No genera el itinerario: el turista revisa y confirma.
async function interpretar(req, res) {
  try {
    return res.json(await iaService.interpretarSolicitud(req.body.texto));
  } catch (err) {
    logger.error("Error al interpretar la solicitud de viaje", err);
    throw new ErrorHttp(500, "No pudimos interpretar tu solicitud. Intenta de nuevo o usa el formulario.");
  }
}

const obtener = async (req, res) => res.json(await itinerarioService.obtenerItinerarioDe(req.params.id, req.usuario));

async function compartir(req, res) {
  return res.json(await itinerarioService.compartirItinerario({ id: req.params.id, turista_id: req.usuario.id }));
}

async function dejarDeCompartir(req, res) {
  await itinerarioService.dejarDeCompartirItinerario({ id: req.params.id, turista_id: req.usuario.id });
  return res.status(204).end();
}

// Público (sin sesión): quien tenga el enlace ve el plan. No se indexa ni se guarda en cachés: si se revoca, deja de verse.
async function verCompartido(req, res) {
  res.set({ "Cache-Control": "no-store", "X-Robots-Tag": "noindex, nofollow" });
  return res.json(await itinerarioService.obtenerItinerarioCompartido(req.params.token));
}

module.exports = { interpretar, generar, obtener, misItinerarios, compartir, dejarDeCompartir, verCompartido };
