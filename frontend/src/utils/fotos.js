// Revisión de las fotos que se adjuntan a un mensaje, ANTES de enviarlas. El servidor vuelve a comprobarlo todo (tipo real, tamaño y cantidad);
// esto solo evita subir algo que de todos modos sería rechazado.
import { traducir } from "../context/idioma";

export const TIPOS_FOTO = ["image/jpeg", "image/png", "image/webp", "image/gif"];

// Devuelve las fotos que se pueden añadir a las que ya hay y, si alguna no sirvió, un mensaje que lo explica.
export function admitirFotos(actuales, nuevas, { max, maxMb }, idioma = "es") {
  const t = (texto, valores) => traducir(idioma, texto, valores);
  const aceptadas = [];
  let error = "";
  for (const archivo of nuevas) {
    if (!TIPOS_FOTO.includes(archivo.type)) { error = t("Solo se aceptan fotos JPG, PNG, WEBP o GIF."); continue; }
    if (archivo.size > maxMb * 1024 * 1024) { error = t("Cada foto puede pesar hasta {n} MB.", { n: maxMb }); continue; }
    if (actuales.length + aceptadas.length >= max) { error = max === 1 ? t("Puedes adjuntar hasta 1 foto por mensaje.") : t("Puedes adjuntar hasta {n} fotos por mensaje.", { n: max }); continue; }
    aceptadas.push(archivo);
  }
  return { aceptadas, error };
}
