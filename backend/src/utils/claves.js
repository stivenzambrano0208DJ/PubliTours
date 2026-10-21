// Mínimo exigido a las cuentas con permisos (administrador): largo, y no solo letras ni solo números.
// Lo usan los scripts que crean o cambian la clave de una cuenta (seedAdmin y cambiarClave).
const LARGO_MINIMO = 12;

const clavePermitida = (clave) =>
  typeof clave === "string" && clave.length >= LARGO_MINIMO && /[A-Za-z]/.test(clave) && /\d/.test(clave);

module.exports = { clavePermitida, LARGO_MINIMO };
