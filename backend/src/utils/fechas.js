// Fechas de calendario (AAAA-MM-DD) en la zona horaria del servidor. Un solo lugar para no repetir estas funciones en cada servicio.
// La zona del servidor debe ser la de Colombia (TZ=America/Bogota): el Docker de este proyecto ya la define.

const FECHA_ISO = /^\d{4}-\d{2}-\d{2}$/;
const MES_ISO = /^\d{4}-(0[1-9]|1[0-2])$/;
const ANIO_MIN = 1900;
const ANIO_MAX = 2200;

const aISO = (fecha) => fecha.toLocaleDateString("en-CA");
const hoyLocal = () => aISO(new Date());

// Hoy desplazado `dias` días (negativo = pasado).
function fechaRelativa(dias) {
  const f = new Date();
  f.setDate(f.getDate() + dias);
  return aISO(f);
}

// ¿Existe en el calendario? "2031-02-31" y "2031-13-45" tienen el formato correcto pero no son fechas.
function esFechaReal(texto) {
  if (typeof texto !== "string" || !FECHA_ISO.test(texto)) return false;
  const [a, m, d] = texto.split("-").map(Number);
  if (a < ANIO_MIN || a > ANIO_MAX) return false;
  const f = new Date(Date.UTC(a, m - 1, d));
  return f.getUTCFullYear() === a && f.getUTCMonth() === m - 1 && f.getUTCDate() === d;
}

// Un mes "AAAA-MM" válido, o el mes actual si lo recibido no lo es.
function mesValidoOActual(texto) {
  const valido = MES_ISO.test(texto || "") && Number(texto.slice(0, 4)) >= ANIO_MIN && Number(texto.slice(0, 4)) <= ANIO_MAX;
  return valido ? texto : hoyLocal().slice(0, 7);
}

// Fecha del día N (1 = inicio) de un plan que empieza en `inicio`, sin saltos por zona horaria ni horario de verano.
function fechaDelDia(inicio, dia) {
  const [a, m, d] = inicio.split("-").map(Number);
  return new Date(Date.UTC(a, m - 1, d + dia - 1)).toISOString().slice(0, 10);
}

module.exports = { FECHA_ISO, aISO, hoyLocal, fechaRelativa, esFechaReal, mesValidoOActual, fechaDelDia };
