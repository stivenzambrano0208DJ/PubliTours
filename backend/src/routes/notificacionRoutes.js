const express = require("express");
const router = express.Router();
const notificacionController = require("../controllers/notificacionController");
const { requireAuth } = require("../middlewares/auth");
const { validarIds } = require("../middlewares/parametros");

validarIds(router, "id"); // un id que no es entero positivo no existe: 404, no un error interno

router.get("/", requireAuth, notificacionController.misNotificaciones);
router.patch("/:id/leido", requireAuth, notificacionController.marcarLeida);

module.exports = router;
