import { RESOLUCION_MINIMA_RECOMENDADA } from "../constants";

// Si el navegador no logra leer la imagen ni dispara error (pasa con archivos raros), no se espera para siempre.
const TIEMPO_LECTURA_MS = 8000;

function obtenerDimensiones(file) {
  return new Promise((resolve) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    const fin = (valor) => { clearTimeout(espera); URL.revokeObjectURL(url); resolve(valor); };
    const espera = setTimeout(() => fin(null), TIEMPO_LECTURA_MS);
    img.onload = () => fin({ width: img.naturalWidth, height: img.naturalHeight });
    img.onerror = () => fin(null);
    img.src = url;
  });
}

// Devuelve true si la foto puede subirse (resolución suficiente o el usuario aceptó la advertencia).
export async function advertirSiBajaResolucion(file) {
  const dim = await obtenerDimensiones(file);
  if (!dim) return true;
  const ladoCorto = Math.min(dim.width, dim.height);
  if (ladoCorto < RESOLUCION_MINIMA_RECOMENDADA) {
    return window.confirm(
      `Esta foto es de ${dim.width}×${dim.height} píxeles, una resolución baja para mostrarse en pantalla grande — es probable que se vea borrosa. ` +
      `Se recomienda al menos ${RESOLUCION_MINIMA_RECOMENDADA}px en el lado más corto. ¿Quieres subirla de todas formas?`
    );
  }
  return true;
}

// Una cámara de celular da fotos de 4 a 12 MB; el servidor admite 5 MB por foto y, con datos móviles, subirlas enteras tarda minutos
// (y al final se rechazan). Por eso la foto se reduce en el propio celular antes de enviarla: 1920 px de lado mayor y JPEG comprimido
// pesan normalmente unos cientos de KB y se ven igual de bien en pantalla.
export const LADO_MAXIMO_FOTO = 1920;
const CALIDAD_JPEG = 0.82;

export function ladoEscalado(ancho, alto, max = LADO_MAXIMO_FOTO) {
  const mayor = Math.max(ancho, alto);
  if (mayor <= max) return { ancho, alto };
  const factor = max / mayor;
  return { ancho: Math.round(ancho * factor), alto: Math.round(alto * factor) };
}

async function cargarImagen(file) {
  if (typeof createImageBitmap === "function") {
    try { return await createImageBitmap(file, { imageOrientation: "from-image" }); } catch { /* se prueba con <img> */ }
  }
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    const espera = setTimeout(() => { URL.revokeObjectURL(url); reject(new Error("imagen ilegible")); }, TIEMPO_LECTURA_MS);
    img.onload = () => { clearTimeout(espera); URL.revokeObjectURL(url); resolve(img); };
    img.onerror = () => { clearTimeout(espera); URL.revokeObjectURL(url); reject(new Error("imagen ilegible")); };
    img.src = url;
  });
}

// Devuelve la foto reducida (File JPEG) o, si no hace falta o algo falla, la original: nunca impide subir una foto.
export async function prepararFoto(file, { ladoMax = LADO_MAXIMO_FOTO, calidad = CALIDAD_JPEG } = {}) {
  if (!file || file.type === "image/gif") return file; // un GIF puede estar animado: no se toca
  try {
    const imagen = await cargarImagen(file);
    const origen = { ancho: imagen.width, alto: imagen.height };
    const { ancho, alto } = ladoEscalado(origen.ancho, origen.alto, ladoMax);
    const lienzo = document.createElement("canvas");
    lienzo.width = ancho;
    lienzo.height = alto;
    const ctx = lienzo.getContext("2d");
    ctx.fillStyle = "#fff"; // los PNG con transparencia quedarían negros al pasar a JPEG
    ctx.fillRect(0, 0, ancho, alto);
    ctx.drawImage(imagen, 0, 0, ancho, alto);
    imagen.close?.();
    const blob = await new Promise((resolve) => lienzo.toBlob(resolve, "image/jpeg", calidad));
    if (!blob || blob.size >= file.size) return file; // no se gana nada: se manda tal cual
    return new File([blob], file.name.replace(/\.[^.]+$/, "") + ".jpg", { type: "image/jpeg", lastModified: Date.now() });
  } catch {
    return file;
  }
}

export const prepararFotos = (files) => Promise.all(Array.from(files).map((f) => prepararFoto(f)));

// Las fotos de un servicio: su galería si tiene, o la portada sola.
export function fotosDelSitio(sitio) {
  if (sitio.imagenes?.length > 0) return sitio.imagenes.map((i) => i.imagen_url);
  return sitio.imagen_url ? [sitio.imagen_url] : [];
}
