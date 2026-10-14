// El QR del comprobante guarda la dirección de verificación (…/verificar/PT-XXXXXX), pero el prestador también puede escribir el
// código a mano. Esta función acepta ambas cosas y devuelve el código normalizado, o null si no es de PubliTours.
// El alfabeto es el del servidor (sin 0/O ni 1/I, que se confunden).
const CODIGO = /^PT-[A-HJKMNP-Z2-9]{6}$/;

export function extraerCodigo(texto) {
  if (typeof texto !== "string") return null;
  const limpio = texto.trim();
  if (!limpio || limpio.length > 300) return null;

  let candidato = limpio;
  const enRuta = limpio.match(/\/verificar\/([^/?#\s]+)/i);
  if (enRuta) {
    try { candidato = decodeURIComponent(enRuta[1]); } catch { return null; }
  }
  candidato = candidato.toUpperCase();
  return CODIGO.test(candidato) ? candidato : null;
}
