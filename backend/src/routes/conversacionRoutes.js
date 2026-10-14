const express = require("express");
const router = express.Router();
const validate = require("../middlewares/validate");
const schemas = require("../validators/schemas");
const conversacionController = require("../controllers/conversacionController");
const { requireAuth, requireRole, requireCorreoVerificado } = require("../middlewares/auth");
const { uploadImagenesMensaje } = require("../middlewares/upload");
const { validarIds } = require("../middlewares/parametros");

validarIds(router, "id", "imagenId", "mensajeId"); // un id que no es entero positivo no existe: 404, no un error interno

// Turistas y prestadores conversan; el administrador no lee conversaciones (solo ve los mensajes que alguien reporta, en /admin).
const participantes = [requireAuth, requireRole("turista", "prestador")];

router.get("/sin-leer", ...participantes, conversacionController.sinLeer);
// Las fotos son privadas: las pide también el administrador, pero la política solo le deja ver las de mensajes reportados.
router.get("/imagenes/:imagenId", requireAuth, requireRole("turista", "prestador", "administrador"), conversacionController.imagen);
router.post("/mensajes/:mensajeId/reportar", ...participantes, validate(schemas.reporteMensaje), conversacionController.reportar);

router.get("/", ...participantes, conversacionController.listar);
// Abrir una conversación y enviar mensajes exigen correo verificado (frena el spam). Autenticación y rol van ANTES de recibir ningún archivo.
router.post("/", ...participantes, requireCorreoVerificado, uploadImagenesMensaje, validate(schemas.mensajeNuevo), conversacionController.iniciar);
router.get("/:id", ...participantes, conversacionController.obtener);
router.patch("/:id/leido", ...participantes, conversacionController.marcarLeida);
router.post("/:id/mensajes", ...participantes, requireCorreoVerificado, uploadImagenesMensaje, validate(schemas.mensajeEnvio), conversacionController.enviar);

module.exports = router;
