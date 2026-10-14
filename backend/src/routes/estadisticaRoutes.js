const express = require("express");
const router = express.Router();
const estadisticaController = require("../controllers/estadisticaController");
const { requireAuth, requireRole } = require("../middlewares/auth");

router.get("/resumen", requireAuth, requireRole("administrador"), estadisticaController.resumen);

module.exports = router;
