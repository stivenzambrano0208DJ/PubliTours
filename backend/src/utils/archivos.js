const fs = require("fs");
const path = require("path");

const RAIZ_PUBLICA = path.join(__dirname, "..", "..", "public");
const RAIZ_SUBIDAS = path.join(RAIZ_PUBLICA, "uploads");
// Fotos de las conversaciones: dentro del mismo volumen (así entran en los respaldos), pero NUNCA se sirven como archivos públicos:
// app.js bloquea /uploads/privado y solo se entregan por una ruta que comprueba que la persona participa en la conversación.
const DIR_PRIVADO_MENSAJES = path.join(RAIZ_SUBIDAS, "privado", "mensajes");
const NOMBRE_ARCHIVO_MENSAJE = /^msg-\d{10,}-\d{1,10}\.(jpg|png|webp|gif)$/;

// Ruta en disco de la foto de un mensaje, o null si el nombre no tiene la forma que genera el servidor (nada de "../").
function rutaArchivoMensaje(nombre) {
  return NOMBRE_ARCHIVO_MENSAJE.test(String(nombre)) ? path.join(DIR_PRIVADO_MENSAJES, nombre) : null;
}

// Borra del disco fotos de mensajes (por su nombre). Best-effort.
function eliminarArchivosMensaje(nombres) {
  for (const nombre of nombres) {
    const ruta = rutaArchivoMensaje(nombre);
    if (ruta) fs.unlink(ruta, () => {});
  }
}

// Extensión que se le da a cada tipo de imagen. Sale del tipo REAL, nunca del nombre que mande el cliente.
const EXTENSION_POR_TIPO = { "image/jpeg": ".jpg", "image/png": ".png", "image/webp": ".webp", "image/gif": ".gif" };

// Reconoce el tipo de imagen por los primeros bytes del archivo (su "firma"); null si no es una imagen permitida.
function tipoDeImagen(cabecera) {
  if (cabecera.length >= 3 && cabecera[0] === 0xff && cabecera[1] === 0xd8 && cabecera[2] === 0xff) return "image/jpeg";
  if (cabecera.length >= 8 && cabecera.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) return "image/png";
  const inicio = cabecera.subarray(0, 6).toString("latin1");
  if (inicio === "GIF87a" || inicio === "GIF89a") return "image/gif";
  if (cabecera.length >= 12 && cabecera.subarray(0, 4).toString("latin1") === "RIFF" && cabecera.subarray(8, 12).toString("latin1") === "WEBP") return "image/webp";
  return null;
}

async function leerCabecera(ruta, bytes = 12) {
  const archivo = await fs.promises.open(ruta, "r");
  try {
    const buffer = Buffer.alloc(bytes);
    const { bytesRead } = await archivo.read(buffer, 0, bytes, 0);
    return buffer.subarray(0, bytesRead);
  } finally {
    await archivo.close();
  }
}

// Archivos que multer dejó en disco para esta petición.
const archivosDeLaPeticion = (req) => [req.file, ...(Array.isArray(req.files) ? req.files : [])].filter(Boolean);

// Borra lo subido en una petición que no llegó a buen término, para no dejar archivos huérfanos.
function eliminarSubidas(req) {
  for (const f of archivosDeLaPeticion(req)) fs.unlink(f.path, () => {}); // best-effort
}

// Borra del disco una foto ya guardada (se identifica por su URL pública, p. ej. /uploads/sitios/x.jpg).
// Solo actúa dentro de public/uploads.
function eliminarArchivoSubido(imagen_url) {
  if (!imagen_url) return;
  const ruta = path.join(RAIZ_PUBLICA, imagen_url.replace(/^\/+/, ""));
  if (!ruta.startsWith(RAIZ_SUBIDAS + path.sep)) return;
  fs.unlink(ruta, () => {}); // best-effort, sin bloquear la respuesta
}

module.exports = {
  EXTENSION_POR_TIPO, tipoDeImagen, leerCabecera, archivosDeLaPeticion, eliminarSubidas, eliminarArchivoSubido,
  DIR_PRIVADO_MENSAJES, rutaArchivoMensaje, eliminarArchivosMensaje,
};
