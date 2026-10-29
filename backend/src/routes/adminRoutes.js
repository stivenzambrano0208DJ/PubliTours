const express = require("express");
const validate = require("../middlewares/validate");
const schemas = require("../validators/schemas");
const router = express.Router();
const adminController = require("../controllers/adminController");
const casoController = require("../controllers/casoController");
const { requireAuth, requireRole } = require("../middlewares/auth");
const { validarIds } = require("../middlewares/parametros");

validarIds(router, "id"); // un id que no es entero positivo no existe: 404, no un error interno

router.use(requireAuth, requireRole("administrador"));
router.get("/usuarios", adminController.listarUsuarios);
router.patch("/usuarios/:id/estado", validate(schemas.estadoUsuario), adminController.cambiarEstadoUsuario);
router.get("/sitios", adminController.listarSitios);
router.patch("/sitios/:id/estado", validate(schemas.moderarSitio), adminController.moderarSitio);
router.get("/paquetes", adminController.listarPaquetes);
router.patch("/paquetes/:id/estado", validate(schemas.moderarSitio), adminController.moderarPaquete);
router.get("/resenas", adminController.listarResenas);
router.delete("/resenas/:id", adminController.eliminarResena);
router.get("/tendencias", adminController.tendencias);
router.get("/tendencias.csv", adminController.descargarTendencias);
router.get("/auditoria", adminController.historial);
router.post("/anuncios", validate(schemas.anuncio), adminController.anunciar);
router.get("/invitaciones", adminController.listarInvitaciones);
router.post("/invitaciones", validate(schemas.invitacion), adminController.invitarNegocio);
router.get("/reportes-mensajes", adminController.listarReportesMensajes);
router.patch("/reportes-mensajes/:id", validate(schemas.resolverReporteMensaje), adminController.resolverReporteMensaje);
router.get("/casos", casoController.listar);
router.patch("/casos/:id", validate(schemas.atenderCaso), casoController.atender);

module.exports = router;
