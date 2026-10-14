const express = require("express");
require("express-async-errors"); // los errores de handlers async llegan al manejador central
const cors = require("cors");
const multer = require("multer");
const helmet = require("helmet");
const path = require("path");
const apiRoutes = require("./routes");
const { sequelize } = require("./models");
const { ErrorHttp } = require("./utils/errores");
const { opcionesCors } = require("./config/entorno");
const { registroPeticiones } = require("./middlewares/registro");
const { limiteGeneral } = require("./middlewares/limites");
const logger = require("./utils/logger");
const { eliminarSubidas } = require("./utils/archivos");

const app = express();

// Detrás de un proxy (nginx, un balanceador) la IP real llega en X-Forwarded-For: TRUST_PROXY = cuántos proxies hay delante.
app.set("trust proxy", Number(process.env.TRUST_PROXY) || 0);

app.use(registroPeticiones);
// Las fotos de /uploads las carga el frontend desde otro origen: sin esto el navegador las bloquearía.
app.use(helmet({ crossOriginResourcePolicy: { policy: "cross-origin" } }));
app.use(cors(opcionesCors()));

// Comprobación de salud para Docker y balanceadores: responde si el proceso vive y la base de datos contesta. Sin límites ni registro.
app.get("/salud", async (req, res) => {
  try {
    await sequelize.authenticate();
    res.json({ estado: "ok", base_de_datos: "ok" });
  } catch {
    res.status(503).json({ estado: "error", base_de_datos: "sin conexión" });
  }
});

app.use(express.json());
// Las fotos de las conversaciones son privadas: este bloqueo va ANTES del servidor de archivos para que nunca se sirvan por aquí.
// Se entregan únicamente por GET /api/v1/conversaciones/imagenes/:id, que comprueba que quien pide participa en la conversación.
app.use("/uploads/privado", (req, res) => res.status(404).json({ error: "Recurso no encontrado." }));
// Solo se sirven imágenes. Aun así se les quita cualquier posibilidad de ejecutar código: sin scripts, en un entorno aislado y sin adivinar el tipo.
app.use("/uploads", express.static(path.join(__dirname, "..", "public", "uploads"), {
  setHeaders: (res) => {
    res.setHeader("Content-Security-Policy", "default-src 'none'; sandbox");
    res.setHeader("X-Content-Type-Options", "nosniff");
  },
}));

app.get("/", (req, res) => {
  res.json({ proyecto: "PubliTours (Caquetá Vive IA)", estado: "API en funcionamiento" });
});

app.use("/api/v1", limiteGeneral, apiRoutes);

// Manejador de errores centralizado
const MENSAJES_SUBIDA = {
  LIMIT_FILE_SIZE: "La imagen supera el máximo de 5 MB.",
  LIMIT_FILE_COUNT: "Subiste más fotos de las permitidas.",
  LIMIT_UNEXPECTED_FILE: "Archivo inesperado: revisa el campo de la imagen.",
};

app.use((err, req, res, _next) => {
  eliminarSubidas(req); // si la petición falló, lo que llegó a subirse no se queda en el disco
  if (err instanceof multer.MulterError) return res.status(400).json({ error: MENSAJES_SUBIDA[err.code] || "No se pudo procesar el archivo." });
  if (err instanceof ErrorHttp) return res.status(err.status).json({ error: err.message, ...err.extra });
  // Un JSON mal formado o demasiado grande es un error del cliente, no del servidor.
  if (err.type === "entity.parse.failed" || err.type === "entity.too.large") return res.status(400).json({ error: "El cuerpo de la petición no es válido." });
  logger.error("Error no controlado", err, { id: req.id, metodo: req.method, ruta: req.originalUrl.split("?")[0] });
  res.status(500).json({ error: "Error interno del servidor.", id: req.id }); // el id permite al usuario reportar el error y al equipo encontrarlo
});

module.exports = app;
