const mensajeService = require("../services/mensajeService");

// Capa HTTP de la mensajería. Las reglas (quién puede escribir, topes, avisos) viven en services/mensajeService.js y politicas/mensajes.js.
// Con fotos, multer ya las guardó en la carpeta privada (req.files); si algo falla, el manejador central las borra.

const archivosDe = (req) => req.files || [];

const iniciar = async (req, res) => {
  const { sitio_id, paquete_id, reserva_id, texto } = req.body;
  return res.status(201).json(await mensajeService.iniciarConversacion({ usuario: req.usuario, sitio_id, paquete_id, reserva_id, texto, archivos: archivosDe(req) }));
};

const listar = async (req, res) => res.json(await mensajeService.listarConversaciones(req.usuario));

const sinLeer = async (req, res) => res.json(await mensajeService.contarSinLeer(req.usuario));

const numero = (v) => (/^[1-9]\d{0,9}$/.test(String(v ?? "")) ? Number(v) : undefined);
const obtener = async (req, res) =>
  res.json(await mensajeService.obtenerConversacion({ usuario: req.usuario, id: req.params.id, antes: numero(req.query.antes), despues: numero(req.query.despues) }));

const marcarLeida = async (req, res) => {
  await mensajeService.marcarLeida({ usuario: req.usuario, id: req.params.id });
  return res.status(204).end();
};

const enviar = async (req, res) =>
  res.status(201).json(await mensajeService.enviarMensaje({ usuario: req.usuario, conversacion_id: req.params.id, texto: req.body.texto, archivos: archivosDe(req) }));

// La foto de un mensaje solo se entrega a quien puede verla; nunca se guarda en cachés compartidas ni se ejecuta como página.
async function imagen(req, res) {
  const { ruta, tipo } = await mensajeService.abrirImagen({ usuario: req.usuario, imagenId: req.params.imagenId });
  res.set({ "Content-Type": tipo, "X-Content-Type-Options": "nosniff", "Content-Security-Policy": "default-src 'none'; sandbox", "Cache-Control": "private, no-store" });
  res.sendFile(ruta, { dotfiles: "deny", cacheControl: false }, (err) => {
    if (err && !res.headersSent) res.status(404).json({ error: "Foto no encontrada." });
  });
}

const reportar = async (req, res) =>
  res.status(201).json(await mensajeService.reportarMensaje({ usuario: req.usuario, mensajeId: req.params.mensajeId, motivo: req.body.motivo, detalle: req.body.detalle }));

module.exports = { iniciar, listar, sinLeer, obtener, marcarLeida, enviar, imagen, reportar };
