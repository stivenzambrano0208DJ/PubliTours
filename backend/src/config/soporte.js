// Reglas de los casos de soporte en un solo lugar (el frontend las lee de GET /configuracion, no las repite).
module.exports = {
  // Por qué se abre un caso sobre una reserva. Los dos últimos de la lista los suele usar el negocio.
  MOTIVOS_CASO: ["no_presto_servicio", "servicio_diferente", "cancelacion_o_cambio", "trato_o_seguridad", "no_asistio_turista", "otro"],
  ESTADOS_CASO: ["abierto", "en_revision", "resuelto"],
  DETALLE_MIN: 20, // caracteres: lo suficiente para entender qué pasó
  DETALLE_MAX: 1000,
  RESPUESTA_MAX: 1000,
  CASOS_POR_DIA: 5, // por persona: frena el abuso sin estorbar a quien de verdad tuvo varios problemas
};
