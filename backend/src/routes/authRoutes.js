const express = require("express");
const validate = require("../middlewares/validate");
const schemas = require("../validators/schemas");
const router = express.Router();
const authController = require("../controllers/authController");
const cuentaController = require("../controllers/cuentaController");
const { requireAuth } = require("../middlewares/auth");
const { limiteAuth } = require("../middlewares/limites");

router.post("/registro", limiteAuth, validate(schemas.auth.registro), authController.registro);
router.post("/login", limiteAuth, validate(schemas.auth.login), authController.login);
router.post("/logout", authController.logout);
router.post("/olvide-password", limiteAuth, validate(schemas.auth.olvidePassword), authController.solicitarRecuperacion);
router.post("/restablecer-password", limiteAuth, validate(schemas.auth.restablecerPassword), authController.restablecerContrasena);
router.post("/verificar-correo", limiteAuth, requireAuth, validate(schemas.auth.verificarCorreo), authController.verificarCorreo);
router.post("/reenviar-verificacion", limiteAuth, requireAuth, authController.reenviarVerificacion);
router.put("/perfil", requireAuth, validate(schemas.auth.perfil), authController.actualizarPerfil);
router.get("/mis-datos", requireAuth, cuentaController.descargarDatos);
router.delete("/cuenta", requireAuth, validate(schemas.auth.eliminarCuenta), cuentaController.eliminar);
router.put("/password", requireAuth, validate(schemas.auth.cambiarPassword), authController.cambiarPassword);

module.exports = router;

// Ruta /usuarios/me se monta aparte porque no cae bajo /auth (ver routes/index.js)
module.exports.meHandler = [requireAuth, authController.me];
