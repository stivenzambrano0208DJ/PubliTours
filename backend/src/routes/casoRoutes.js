const express = require("express");
const validate = require("../middlewares/validate");
const schemas = require("../validators/schemas");
const router = express.Router();
const casoController = require("../controllers/casoController");
const { requireAuth, requireRole, requireCorreoVerificado } = require("../middlewares/auth");

// Casos de soporte: la turista o el negocio de una reserva reporta un problema. La administración los atiende en /admin/casos.
router.post("/", requireAuth, requireRole("turista", "prestador"), requireCorreoVerificado, validate(schemas.casoNuevo), casoController.abrir);
router.get("/mios", requireAuth, requireRole("turista", "prestador"), casoController.mios);

module.exports = router;
