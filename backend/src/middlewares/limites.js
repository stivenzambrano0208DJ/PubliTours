const { rateLimit } = require("express-rate-limit");

const pasar = (req, res, next) => next();

// Límites de peticiones por IP: uno general para toda la API y otro más estricto para el inicio de sesión, el registro y la
// recuperación de contraseña (frenan la fuerza bruta y el abuso del envío de correos). Con `activo: false` no limitan.
function crearLimitadores({ activo = true, ventanaMs = 15 * 60 * 1000, maxGeneral = 600, maxAuth = 30 } = {}) {
  if (!activo) return { general: pasar, auth: pasar };
  const base = {
    windowMs: ventanaMs,
    standardHeaders: "draft-7", // RateLimit-* en la respuesta, para que el cliente sepa cuánto falta
    legacyHeaders: false,
  };
  return {
    general: rateLimit({ ...base, limit: maxGeneral, handler: (req, res) => res.status(429).json({ error: "Demasiadas solicitudes. Espera unos minutos e inténtalo de nuevo." }) }),
    auth: rateLimit({ ...base, limit: maxAuth, handler: (req, res) => res.status(429).json({ error: "Demasiados intentos. Espera unos minutos antes de volver a intentarlo." }) }),
  };
}

// En las pruebas (NODE_ENV=test) no se limita: harían fallar pruebas que repiten muchas peticiones desde la misma IP.
const entero = (valor, porDefecto) => (Number.isInteger(Number(valor)) && Number(valor) > 0 ? Number(valor) : porDefecto);
const limitadores = crearLimitadores({
  activo: process.env.NODE_ENV !== "test",
  maxGeneral: entero(process.env.LIMITE_PETICIONES, 600),
  maxAuth: entero(process.env.LIMITE_INTENTOS_AUTH, 30),
});

module.exports = { crearLimitadores, limiteGeneral: limitadores.general, limiteAuth: limitadores.auth };
