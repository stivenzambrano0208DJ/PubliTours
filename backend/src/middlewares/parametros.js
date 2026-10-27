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

// Los filtros de la dirección (?categoria=...&orden=...) deben llegar al servicio como textos simples. Con el lector por defecto de Express,
// `categoria[$gt]=1` llega como un OBJETO y `categoria=a&categoria=b` como una lista, y ambos terminaban en la consulta a la base de datos
// como error interno (500). Junto con `app.set("query parser", "simple")` (que no crea objetos anidados), si un filtro se repite se usa el último valor.
function consultaPlana(req, res, next) {
  for (const [clave, valor] of Object.entries(req.query)) {
    if (Array.isArray(valor)) req.query[clave] = valor[valor.length - 1];
  }
  next();
}

module.exports = { validarIds, consultaPlana };
