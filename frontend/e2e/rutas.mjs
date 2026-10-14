import path from "node:path";
import { fileURLToPath } from "node:url";

// Cámara de prueba de Chrome: reproduce este archivo (una foto del QR de un comprobante, que la prueba genera) en vez de una cámara real.
// Si el archivo no existe, Chrome muestra su patrón de prueba y el escáner simplemente no lee nada.
export const VIDEO_CAMARA = path.join(path.dirname(fileURLToPath(import.meta.url)), ".tmp", "camara-qr.mjpeg");
