// Registro de eventos. En producción una línea JSON por evento (fácil de filtrar y de enviar a un servicio de logs);
// en desarrollo una línea legible. En las pruebas no escribe nada (salvo LOG_EN_TEST=1).
// Regla: nunca se registran cuerpos de peticiones, cabeceras, contraseñas ni tokens: solo método, ruta (sin query) y estado.

function formatear(nivel, mensaje, datos = {}, produccion = false, ahora = new Date()) {
  if (produccion) return JSON.stringify({ t: ahora.toISOString(), nivel, msg: mensaje, ...datos });
  const extra = Object.keys(datos).length ? ` ${JSON.stringify(datos)}` : "";
  return `${ahora.toISOString()} ${nivel.toUpperCase()} ${mensaje}${extra}`;
}

function escribir(nivel, mensaje, datos) {
  if (process.env.NODE_ENV === "test" && !process.env.LOG_EN_TEST) return;
  const linea = formatear(nivel, mensaje, datos, process.env.NODE_ENV === "production");
  (nivel === "error" || nivel === "warn" ? console.error : console.log)(linea);
}

// Un Error se registra con su mensaje y su traza.
const datosDeError = (err) => ({ error: err?.message, pila: err?.stack });

module.exports = {
  formatear,
  info: (mensaje, datos) => escribir("info", mensaje, datos),
  warn: (mensaje, datos) => escribir("warn", mensaje, datos),
  error: (mensaje, err, datos) => escribir("error", mensaje, { ...datosDeError(err), ...datos }),
};
