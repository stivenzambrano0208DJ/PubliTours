const express = require("express");
const validate = require("../middlewares/validate");
const schemas = require("../validators/schemas");
const router = express.Router();
const resenaController = require("../controllers/resenaController");
const reservaController = require("../controllers/reservaController");
const { requireAuth, requireRole, requireCorreoVerificado } = require("../middlewares/auth");
const { validarIds } = require("../middlewares/parametros");

validarIds(router, "id"); // un id que no es entero positivo no existe: 404, no un error interno

router.post("/", requireAuth, requireRole("turista", "prestador"), requireCorreoVerificado, validate(schemas.reserva), reservaController.solicitar);
router.get("/verificar/:codigo", reservaController.verificar); // público: comprobar un código
router.get("/mias", requireAuth, requireRole("turista", "prestador"), reservaController.misReservas);
router.get("/recibidas", requireAuth, requireRole("prestador"), reservaController.reservasRecibidas);
router.patch("/:id/confirmar", requireAuth, requireRole("prestador"), reservaController.confirmar);
router.patch("/:id/editar", requireAuth, requireRole("turista", "prestador"), requireCorreoVerificado, validate(schemas.edicionReserva), reservaController.editar);
router.get("/:id", requireAuth, reservaController.obtener);
router.patch("/:id/cancelar", requireAuth, requireRole("turista", "prestador"), reservaController.cancelar);
router.post("/:id/resena", requireAuth, requireRole("turista", "prestador"), requireCorreoVerificado, validate(schemas.resena), resenaController.crear);
router.patch("/:id/asistencia", requireAuth, requireRole("prestador"), validate(schemas.asistencia), reservaController.asistencia);
router.patch("/:id/rechazar", requireAuth, requireRole("prestador"), validate(schemas.rechazo), reservaController.rechazar);

module.exports = router;
