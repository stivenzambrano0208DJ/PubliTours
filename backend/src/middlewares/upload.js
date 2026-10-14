const multer = require("multer");
const path = require("path");
const fs = require("fs");
const { ErrorHttp } = require("../utils/errores");
const { EXTENSION_POR_TIPO, tipoDeImagen, leerCabecera, archivosDeLaPeticion, eliminarSubidas, DIR_PRIVADO_MENSAJES } = require("../utils/archivos");
const { FOTOS_MAX, FOTO_MAX_MB } = require("../config/mensajeria");

const UPLOAD_DIR = path.join(__dirname, "..", "..", "public", "uploads", "sitios");
fs.mkdirSync(UPLOAD_DIR, { recursive: true });

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, UPLOAD_DIR),
  // La extensión depende del tipo aceptado, no del nombre original: así no se puede subir un .html o .js disfrazado de imagen.
  filename: (req, file, cb) => cb(null, `sitio-${Date.now()}-${Math.round(Math.random() * 1e9)}${EXTENSION_POR_TIPO[file.mimetype]}`),
});

function filtroArchivo(req, file, cb) {
  if (!EXTENSION_POR_TIPO[file.mimetype]) return cb(new ErrorHttp(400, "Formato de imagen no permitido. Usa JPG, PNG, WEBP o GIF."));
  cb(null, true);
}

// El tipo que declara el cliente se puede falsificar: se comprueba que el contenido real sea una imagen de ese mismo tipo.
async function verificarContenido(req, res, next) {
  for (const archivo of archivosDeLaPeticion(req)) {
    if (tipoDeImagen(await leerCabecera(archivo.path)) !== archivo.mimetype) {
      eliminarSubidas(req);
      throw new ErrorHttp(400, "El archivo no es una imagen válida. Usa JPG, PNG, WEBP o GIF.");
    }
  }
  next();
}

const opciones = {
  storage,
  fileFilter: filtroArchivo,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5 MB por archivo
};

// Fotos de una conversación: carpeta privada, con un nombre que el servidor genera (el nombre original nunca se usa).
fs.mkdirSync(DIR_PRIVADO_MENSAJES, { recursive: true });
const storageMensajes = multer.diskStorage({
  destination: (req, file, cb) => cb(null, DIR_PRIVADO_MENSAJES),
  filename: (req, file, cb) => cb(null, `msg-${Date.now()}-${Math.round(Math.random() * 1e9)}${EXTENSION_POR_TIPO[file.mimetype]}`),
});

const uploadImagenSitio = [multer(opciones).single("imagen"), verificarContenido];
const uploadGaleriaSitio = [multer(opciones).array("imagenes", 8), verificarContenido]; // hasta 8 fotos por sitio

const uploadImagenesMensaje = [multer({ ...opciones, storage: storageMensajes, limits: { fileSize: FOTO_MAX_MB * 1024 * 1024 } }).array("imagenes", FOTOS_MAX), verificarContenido];

module.exports = { uploadImagenSitio, uploadGaleriaSitio, uploadImagenesMensaje };
