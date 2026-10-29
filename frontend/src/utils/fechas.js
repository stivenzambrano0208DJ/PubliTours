// Fecha del día N (1 = inicio) de un plan que empieza en `inicio` (AAAA-MM-DD). Se calcula en UTC para que
// ni la zona horaria ni el horario de verano muevan el día; mismas reglas que el servidor.
export function fechaDelDia(inicio, dia) {
  const [a, m, d] = inicio.split("-").map(Number);
  return new Date(Date.UTC(a, m - 1, d + Number(dia) - 1)).toISOString().slice(0, 10);
}

// Suma días a una fecha AAAA-MM-DD (en UTC, sin desfases de zona horaria ni horario de verano).
export const sumarDias = (fecha, dias) => fechaDelDia(fecha, dias + 1);

// "2030-11-12" -> "mié 12 nov" (sin desfase de zona horaria).
export function fechaCorta(fecha, locale = "es-CO") {
  const [a, m, d] = fecha.split("-").map(Number);
  return new Date(a, m - 1, d).toLocaleDateString(locale, { weekday: "short", day: "numeric", month: "short" });
}

// Hoy como AAAA-MM-DD en la zona horaria del navegador.
export const hoyISO = () => new Date().toLocaleDateString("en-CA");
