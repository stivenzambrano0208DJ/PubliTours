const express = require("express");
const { comisionPorcentaje, POLITICAS_CANCELACION, DIAS_GRACIA_ASISTENCIA } = require("../config/negocio");
const { TEXTO_MAX, FOTOS_MAX, FOTO_MAX_MB, MOTIVOS_REPORTE } = require("../config/mensajeria");
const router = express.Router();

// Datos del modelo de negocio que la página muestra tal cual (Términos, "Conviértete en prestador").
router.get("/", (req, res) => res.json({ comision_pct: comisionPorcentaje(), politicas_cancelacion: POLITICAS_CANCELACION, dias_gracia_asistencia: DIAS_GRACIA_ASISTENCIA,
  mensajeria: { texto_max: TEXTO_MAX, fotos_max: FOTOS_MAX, foto_max_mb: FOTO_MAX_MB, motivos_reporte: MOTIVOS_REPORTE },
}));

module.exports = router;
