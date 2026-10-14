const { eliminarSubidas } = require("../utils/archivos");

// Valida y normaliza req.body con un esquema zod; responde 400 con el primer mensaje de error.
// Si la petición traía fotos (multer ya las guardó), se borran: un formulario inválido no deja archivos en el disco.
function validate(schema) {
  return (req, res, next) => {
    const resultado = schema.safeParse(req.body ?? {});
    if (!resultado.success) {
      eliminarSubidas(req);
      const [primero] = resultado.error.issues;
      return res.status(400).json({
        error: primero.message,
        detalles: resultado.error.issues.map((i) => ({ campo: i.path.join("."), mensaje: i.message })),
      });
    }
    req.body = resultado.data;
    next();
  };
}

module.exports = validate;
