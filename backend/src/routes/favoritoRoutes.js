const express = require("express");
const router = express.Router();
const favoritoController = require("../controllers/favoritoController");
const { requireAuth, requireRole } = require("../middlewares/auth");
const { validarIds } = require("../middlewares/parametros");

validarIds(router, "sitioId"); // un id que no es entero positivo no existe: 404, no un error interno

router.use(requireAuth, requireRole("turista", "prestador"));
router.get("/", favoritoController.listar);
router.post("/:sitioId", favoritoController.agregar);
router.delete("/:sitioId", favoritoController.quitar);

module.exports = router;
