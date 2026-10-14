// Los identificadores de la URL (/sitios/:id, /reservas/:id...) deben ser enteros positivos que quepan en la base de datos.
// Si no lo son (abc, 1.5, 99999999999999999999) ese recurso no puede existir: se responde 404 sin llegar a la consulta,
// en lugar de dejar que PostgreSQL falle con un error interno (500).
const ENTERO_POSITIVO = /^[1-9]\d{0,9}$/;
const MAX_INTEGER_PG = 2147483647;

function idValido(req, res, next, valor) {
  if (!ENTERO_POSITIVO.test(valor) || Number(valor) > MAX_INTEGER_PG) return res.status(404).json({ error: "Recurso no encontrado." });
  next();
}

// Registra la comprobación para los parámetros indicados de un router.
function validarIds(router, ...nombres) {
  for (const nombre of nombres) router.param(nombre, idValido);
}

module.exports = { validarIds };
