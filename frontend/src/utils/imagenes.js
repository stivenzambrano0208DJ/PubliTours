import { RESOLUCION_MINIMA_RECOMENDADA } from "../constants";

function obtenerDimensiones(file) {
  return new Promise((resolve) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => { resolve({ width: img.naturalWidth, height: img.naturalHeight }); URL.revokeObjectURL(url); };
    img.onerror = () => { resolve(null); URL.revokeObjectURL(url); };
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

// Las fotos de un servicio: su galería si tiene, o la portada sola.
export function fotosDelSitio(sitio) {
  if (sitio.imagenes?.length > 0) return sitio.imagenes.map((i) => i.imagen_url);
  return sitio.imagen_url ? [sitio.imagen_url] : [];
}
