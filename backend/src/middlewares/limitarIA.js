// Tope de consultas con IA por persona y por hora, para controlar el costo. Se reinicia al reiniciar el servidor y vive en la
// memoria de este proceso: con varias instancias del servidor cada una cuenta por su lado (ver README, pendientes).
const LIMITE_POR_HORA = Number(process.env.IA_LIMITE_POR_HORA || 20);
const VENTANA_MS = 3600000;
const usoIA = new Map();

function limitarIA(req, res, next) {
  const ahora = Date.now();
  const recientes = (usoIA.get(req.usuario.id) || []).filter((t) => ahora - t < VENTANA_MS);
  if (recientes.length >= LIMITE_POR_HORA) {
    return res.status(429).json({ error: "Alcanzaste el límite de consultas con IA por hora. Puedes seguir usando el formulario." });
  }
  recientes.push(ahora);
  usoIA.set(req.usuario.id, recientes);
  next();
}

module.exports = { limitarIA };
