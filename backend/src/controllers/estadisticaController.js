const estadisticaService = require("../services/estadisticaService");

// RF-15: panel de estadísticas para el administrador.
async function resumen(req, res) {
  const datos = await estadisticaService.obtenerResumen();
  return res.json(datos);
}

module.exports = { resumen };
