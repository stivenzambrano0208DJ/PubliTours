// Error con código HTTP: los servicios lo lanzan y el manejador central de app.js lo convierte en respuesta.
// `extra` (opcional) son datos adicionales que se devuelven junto al mensaje, p. ej. { faltan: [...] } para resaltar un formulario.
class ErrorHttp extends Error {
  constructor(status, message, extra) {
    super(message);
    this.status = status;
    this.extra = extra;
  }
}

module.exports = { ErrorHttp };
