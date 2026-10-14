const express = require("express");
const validate = require("../middlewares/validate");
const schemas = require("../validators/schemas");
const router = express.Router();
const paqueteController = require("../controllers/paqueteController");
const resenaController = require("../controllers/resenaController");
const { uploadImagenSitio, uploadGaleriaSitio } = require("../middlewares/upload");
const { requireAuth, requireRole } = require("../middlewares/auth");
const { validarIds } = require("../middlewares/parametros");

validarIds(router, "id", "imagenId"); // un id que no es entero positivo no existe: 404, no un error interno

const prestador = [requireAuth, requireRole("prestador")];

router.get("/", paqueteController.listar); // público
router.get("/mios", ...prestador, paqueteController.misPaquetes);
router.get("/:id", paqueteController.obtener);
router.get("/:id/resenas", resenaController.listarPorPaquete);
router.get("/:id/disponibilidad", paqueteController.calendario);
router.get("/:id/fechas-bloqueadas", paqueteController.fechasBloqueadas);
router.post("/", ...prestador, uploadImagenSitio, validate(schemas.paquete), paqueteController.crear);
router.put("/:id", ...prestador, uploadImagenSitio, validate(schemas.paquete), paqueteController.actualizar);
router.post("/:id/imagenes", ...prestador, uploadGaleriaSitio, paqueteController.agregarImagenes);
router.delete("/:id/imagenes/:imagenId", ...prestador, paqueteController.eliminarImagen);
router.patch("/:id/estado", ...prestador, validate(schemas.estadoPaquete), paqueteController.cambiarEstado);
router.delete("/:id", ...prestador, paqueteController.eliminar);

module.exports = router;
