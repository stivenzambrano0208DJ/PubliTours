const crypto = require("crypto");
const logger = require("../utils/logger");

// Cada petición recibe un identificador (X-Request-Id) que viaja en la respuesta y en los registros, para rastrear un error
// desde lo que ve el usuario hasta el log. Solo se aceptan identificadores simples enviados por el cliente o por un proxy.
const ID_VALIDO = /^[\w-]{8,64}$/;

function registroPeticiones(req, res, next) {
  const id = ID_VALIDO.test(req.headers["x-request-id"] || "") ? req.headers["x-request-id"] : crypto.randomUUID();
  req.id = id;
  res.setHeader("X-Request-Id", id);

  const inicio = process.hrtime.bigint();
  res.on("finish", () => {
    if (req.path === "/salud") return; // las comprobaciones de salud (cada pocos segundos) no son ruido útil
    logger.info("peticion", {
      id,
      metodo: req.method,
      ruta: req.originalUrl.split("?")[0], // sin la query: puede traer datos del usuario
      estado: res.statusCode,
      ms: Math.round(Number(process.hrtime.bigint() - inicio) / 1e6),
    });
  });
  next();
}

module.exports = { registroPeticiones };
