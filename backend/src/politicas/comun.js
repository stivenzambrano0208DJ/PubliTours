const { ErrorHttp } = require("../utils/errores");

// Piezas comunes de las políticas de autorización.
//
// Una POLÍTICA responde a una pregunta: "¿esta persona puede hacer esto con este recurso?". Cada política es una función pura
// (recibe datos ya cargados, no consulta la base) y tiene su versión `exigir…`, que lanza el error que ya usaba la API. Los servicios
// cargan los datos y le preguntan a la política; nunca comparan ids ni roles por su cuenta.

const esAdministrador = (usuario) => usuario?.rol === "administrador";
const esPrestador = (usuario) => usuario?.rol === "prestador";

// Si no está permitido, lanza ErrorHttp con el estado y el mensaje que la API ya devolvía en ese caso (el contrato no cambia).
function exigir(permitido, estado, mensaje) {
  if (!permitido) throw new ErrorHttp(estado, mensaje);
}

module.exports = { esAdministrador, esPrestador, exigir };
