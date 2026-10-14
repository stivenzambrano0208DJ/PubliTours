const express = require("express");
const validate = require("../middlewares/validate");
const schemas = require("../validators/schemas");
const router = express.Router();
const resenaController = require("../controllers/resenaController");
const catalogoController = require("../controllers/catalogoController");
const { requireAuth, requireRole } = require("../middlewares/auth");
const { uploadImagenSitio, uploadGaleriaSitio } = require("../middlewares/upload");
const { validarIds } = require("../middlewares/parametros");

validarIds(router, "id", "fechaId", "imagenId"); // un id que no es entero positivo no existe: 404, no un error interno

router.get("/", catalogoController.listar); // RF-05/RF-06: búsqueda y filtros, público
router.get("/:id", catalogoController.obtener);
router.get("/:id/resenas", resenaController.listarPorSitio);
router.get("/:id/cotizar", catalogoController.cotizarSitio);
router.get("/:id/disponibilidad", catalogoController.calendarioSitio);
router.post("/", requireAuth, requireRole("prestador"), uploadImagenSitio, validate(schemas.sitio), catalogoController.crear);
router.put("/:id", requireAuth, requireRole("prestador"), uploadImagenSitio, validate(schemas.sitio), catalogoController.actualizar);
router.delete("/:id", requireAuth, requireRole("prestador"), catalogoController.eliminar);
router.get("/:id/fechas-bloqueadas", catalogoController.listarFechasBloqueadas);
router.post("/:id/fechas-bloqueadas", requireAuth, requireRole("prestador"), validate(schemas.fechaBloqueada), catalogoController.bloquearFecha);
router.delete("/:id/fechas-bloqueadas/:fechaId", requireAuth, requireRole("prestador"), catalogoController.desbloquearFecha);
router.post("/:id/imagenes", requireAuth, requireRole("prestador"), uploadGaleriaSitio, catalogoController.agregarImagenes);
router.delete("/:id/imagenes/:imagenId", requireAuth, requireRole("prestador"), catalogoController.eliminarImagen);

module.exports = router;
