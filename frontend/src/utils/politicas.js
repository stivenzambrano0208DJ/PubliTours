export const NOMBRES_POLITICA = { flexible: "Flexible", moderada: "Moderada", estricta: "Estricta" };
export const CLAVES_POLITICA = Object.keys(NOMBRES_POLITICA);

export const textoDias = (dias) => `${dias} día${dias === 1 ? "" : "s"}`;

// Días que faltan para una fecha AAAA-MM-DD (hoy = 0), sin desfases de zona horaria.
export function diasHasta(fecha, hoy = new Date()) {
  const [a, m, d] = fecha.split("-").map(Number);
  return Math.round((new Date(a, m - 1, d) - new Date(hoy.getFullYear(), hoy.getMonth(), hoy.getDate())) / 864e5);
}

// ¿Cancelar hoy una reserva de esa fecha sería "tardío" con esa política? `plazos` = { flexible: 1, ... } del servidor.
export const seriaTardia = (plazos, politica, fecha) => Boolean(plazos?.[politica]) && diasHasta(fecha) < plazos[politica];
