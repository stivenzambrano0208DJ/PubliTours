const express = require("express");
const validate = require("../middlewares/validate");
const schemas = require("../validators/schemas");
const router = express.Router();
const itinerarioController = require("../controllers/itinerarioController");
const { requireAuth } = require("../middlewares/auth");
const { limitarIA } = require("../middlewares/limitarIA");
const { validarIds } = require("../middlewares/parametros");

validarIds(router, "id"); // un id que no es entero positivo no existe: 404, no un error interno

router.post("/interpretar", requireAuth, limitarIA, validate(schemas.interpretarViaje), itinerarioController.interpretar);
router.post("/", requireAuth, validate(schemas.itinerario), itinerarioController.generar);
router.get("/", requireAuth, itinerarioController.misItinerarios);
router.get("/compartido/:token", itinerarioController.verCompartido); // público: no pide sesión
router.get("/:id", requireAuth, itinerarioController.obtener);
router.post("/:id/compartir", requireAuth, itinerarioController.compartir);
router.delete("/:id/compartir", requireAuth, itinerarioController.dejarDeCompartir);

module.exports = router;
