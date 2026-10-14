// Convierte lo que el prestador escribió en "redes o sitio web" en un enlace seguro, o null si no lo es.
// Solo se permiten http y https (nunca javascript: ni otros esquemas) y el texto no puede tener espacios.
export function enlaceExterno(texto) {
  const valor = (texto || "").trim();
  if (!valor || /\s/.test(valor)) return null;
  const conEsquema = /^[a-z][a-z0-9+.-]*:/i.test(valor) ? valor : `https://${valor}`;
  try {
    const url = new URL(conEsquema);
    if (url.protocol !== "http:" && url.protocol !== "https:") return null;
    if (!url.hostname.includes(".")) return null;
    return url.href;
  } catch {
    return null;
  }
}

// Enlace de WhatsApp (Colombia) a partir de un número de solo dígitos.
export const enlaceWhatsApp = (telefono) => (telefono ? `https://wa.me/57${telefono}` : null);
