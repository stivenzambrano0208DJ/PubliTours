const express = require("express");
const validate = require("../middlewares/validate");
const schemas = require("../validators/schemas");
const resenaController = require("../controllers/resenaController");
const { requireAuth, requireRole } = require("../middlewares/auth");
const router = express.Router();

const authRoutes = require("./authRoutes");
const prestadorRoutes = require("./prestadorRoutes");
const catalogoRoutes = require("./catalogoRoutes");
const itinerarioRoutes = require("./itinerarioRoutes");
const reservaRoutes = require("./reservaRoutes");
const notificacionRoutes = require("./notificacionRoutes");
const estadisticaRoutes = require("./estadisticaRoutes");
const favoritoRoutes = require("./favoritoRoutes");
const adminRoutes = require("./adminRoutes");
const paqueteRoutes = require("./paqueteRoutes");
const configuracionRoutes = require("./configuracionRoutes");
const conversacionRoutes = require("./conversacionRoutes");
const { validarIds } = require("../middlewares/parametros");

validarIds(router, "id"); // un id que no es entero positivo no existe: 404, no un error interno

router.use("/auth", authRoutes);
router.get("/usuarios/me", ...authRoutes.meHandler); // RF-01/RF-16
router.use("/prestadores", prestadorRoutes);
router.use("/sitios", catalogoRoutes);
router.use("/itinerarios", itinerarioRoutes);
router.use("/reservas", reservaRoutes);
router.use("/notificaciones", notificacionRoutes);
router.use("/estadisticas", estadisticaRoutes);
router.use("/favoritos", favoritoRoutes);
router.use("/admin", adminRoutes);
router.use("/paquetes", paqueteRoutes);
router.use("/configuracion", configuracionRoutes);
router.use("/conversaciones", conversacionRoutes);
router.put("/resenas/:id/respuesta", requireAuth, requireRole("prestador"), validate(schemas.respuestaResena), resenaController.responder);

module.exports = router;
