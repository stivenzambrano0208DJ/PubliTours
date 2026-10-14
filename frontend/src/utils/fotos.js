// Revisión de las fotos que se adjuntan a un mensaje, ANTES de enviarlas. El servidor vuelve a comprobarlo todo (tipo real, tamaño y cantidad);
// esto solo evita subir algo que de todos modos sería rechazado.
export const TIPOS_FOTO = ["image/jpeg", "image/png", "image/webp", "image/gif"];

// Devuelve las fotos que se pueden añadir a las que ya hay y, si alguna no sirvió, un mensaje que lo explica.
export function admitirFotos(actuales, nuevas, { max, maxMb }) {
  const aceptadas = [];
  let error = "";
  for (const archivo of nuevas) {
    if (!TIPOS_FOTO.includes(archivo.type)) { error = "Solo se aceptan fotos JPG, PNG, WEBP o GIF."; continue; }
    if (archivo.size > maxMb * 1024 * 1024) { error = `Cada foto puede pesar hasta ${maxMb} MB.`; continue; }
    if (actuales.length + aceptadas.length >= max) { error = `Puedes adjuntar hasta ${max} foto${max === 1 ? "" : "s"} por mensaje.`; continue; }
    aceptadas.push(archivo);
  }
  return { aceptadas, error };
}
