const { hoyLocal } = require("../utils/fechas");
// Reglas del modelo de negocio. Un solo lugar para los números, para que backend, reportes y textos legales no se contradigan.

// Comisión de la plataforma sobre cada reserva aceptada, en %. Hoy es solo una estimación: no se cobra ni se procesan pagos.
const COMISION_POR_DEFECTO = 10;

// Se lee en cada uso (no al cargar el módulo) para poder cambiarla con COMISION_PORCENTAJE en .env y para probarla.
function comisionPorcentaje() {
  const valor = Number(process.env.COMISION_PORCENTAJE ?? COMISION_POR_DEFECTO);
  return Number.isFinite(valor) && valor >= 0 && valor <= 50 ? valor : COMISION_POR_DEFECTO;
}

// Comisión de un total, redondeada a centavos.
const calcularComision = (total, porcentaje) => Math.round(Number(total) * porcentaje) / 100;

// Política de cancelación que elige el prestador por servicio o paquete: días de antelación con los que el turista
// puede cancelar sin que cuente como "tardía". Cancelar siempre se puede hasta el día anterior (como antes);
// pasado el plazo la reserva queda marcada como cancelación tardía y el prestador lo ve. Cuando haya pagos, esa marca decidirá el reembolso.
const POLITICAS_CANCELACION = { flexible: 1, moderada: 3, estricta: 7 };
const POLITICA_POR_DEFECTO = "flexible";

const diasHasta = (fecha) => Math.round((new Date(`${fecha}T00:00:00`) - new Date(`${hoyLocal()}T00:00:00`)) / 864e5);

// ¿Cancelar hoy una reserva de esa fecha incumple la política? (menos días de antelación que los exigidos)
const esCancelacionTardia = (politica, fecha_servicio) =>
  diasHasta(fecha_servicio) < (POLITICAS_CANCELACION[politica] ?? POLITICAS_CANCELACION[POLITICA_POR_DEFECTO]);

// Después del servicio el prestador registra si el turista asistió. Si no lo hace en este plazo (días desde la fecha del servicio),
// la reserva se cierra sola como completada, para que un descuido del prestador no le quite al turista la posibilidad de reseñar.
const DIAS_GRACIA_ASISTENCIA = 3;

module.exports = { DIAS_GRACIA_ASISTENCIA, comisionPorcentaje, calcularComision, POLITICAS_CANCELACION, esCancelacionTardia };
