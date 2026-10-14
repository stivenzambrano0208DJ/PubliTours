const express = require("express");
const validate = require("../middlewares/validate");
const schemas = require("../validators/schemas");
const router = express.Router();
const prestadorController = require("../controllers/prestadorController");
const { requireAuth, requireRole, requireCorreoVerificado } = require("../middlewares/auth");
const { validarIds } = require("../middlewares/parametros");

validarIds(router, "id"); // un id que no es entero positivo no existe: 404, no un error interno

router.get("/:id/publico", prestadorController.perfilPublico); // público
router.get("/me", requireAuth, requireRole("prestador"), prestadorController.obtenerPerfilPropio);
router.get("/me/sitios", requireAuth, requireRole("prestador"), prestadorController.misSitios);
router.get("/me/resumen", requireAuth, requireRole("prestador"), prestadorController.resumenServicios);
router.get("/me/estadisticas", requireAuth, requireRole("prestador"), prestadorController.estadisticasPropias);
router.get("/me/estadisticas.csv", requireAuth, requireRole("prestador"), prestadorController.descargarEstadisticasCsv);
router.get("/me/resenas", requireAuth, requireRole("prestador"), prestadorController.resenasRecibidas);
router.post("/", requireAuth, requireRole("prestador"), validate(schemas.prestador), prestadorController.crearPerfil);
router.put("/:id", requireAuth, requireRole("prestador"), validate(schemas.prestador), prestadorController.actualizarPerfil);
router.post("/:id/enviar-revision", requireAuth, requireRole("prestador"), requireCorreoVerificado, prestadorController.enviarARevision);
router.get("/", requireAuth, requireRole("administrador"), prestadorController.listarTodos);
router.get("/pendientes", requireAuth, requireRole("administrador"), prestadorController.listarPendientes);
router.patch("/:id/verificar", requireAuth, requireRole("administrador"), validate(schemas.verificarPrestador), prestadorController.verificar);

module.exports = router;
