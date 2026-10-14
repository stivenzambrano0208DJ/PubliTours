// Reglas de la mensajería en un solo lugar (el frontend las lee de GET /configuracion, no las repite).
module.exports = {
  TEXTO_MAX: 1500, // caracteres por mensaje
  FOTOS_MAX: 3, // fotos por mensaje
  FOTO_MAX_MB: 5, // tamaño máximo de cada foto
  MENSAJES_POR_HORA: 60, // por persona: frena el envío masivo
  CONVERSACIONES_NUEVAS_POR_DIA: 10, // negocios distintos a los que una persona puede escribir por primera vez en 24 h
  MOTIVOS_REPORTE: ["spam", "ofensivo", "contacto_externo", "estafa", "otro"],
};
