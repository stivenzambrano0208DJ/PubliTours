const { ErrorHttp } = require("./errores");
const { aISO, esFechaReal } = require("./fechas");

const MAX_DIAS = 731; // dos años

const diasEntre = (a, b) => Math.round((new Date(`${b}T00:00:00`) - new Date(`${a}T00:00:00`)) / 864e5);

// Periodo por defecto: los últimos 6 meses más el actual completo (hasta fin de mes, para incluir lo que viene).
function periodoPorDefecto() {
  const hoy = new Date();
  return { desde: aISO(new Date(hoy.getFullYear(), hoy.getMonth() - 5, 1)), hasta: aISO(new Date(hoy.getFullYear(), hoy.getMonth() + 1, 0)) };
}

// Valida { desde, hasta } (AAAA-MM-DD); lo que falta se completa con el periodo por defecto.
function validarPeriodo({ desde, hasta } = {}) {
  const base = periodoPorDefecto();
  const periodo = { desde: desde || base.desde, hasta: hasta || base.hasta };
  if (!esFechaReal(periodo.desde) || !esFechaReal(periodo.hasta)) throw new ErrorHttp(400, "Las fechas deben tener el formato AAAA-MM-DD.");
  if (periodo.desde > periodo.hasta) throw new ErrorHttp(400, "La fecha inicial no puede ser posterior a la final.");
  if (diasEntre(periodo.desde, periodo.hasta) > MAX_DIAS) throw new ErrorHttp(400, "El periodo no puede superar 2 años.");
  return periodo;
}

// Lista de meses "AAAA-MM" desde el mes de `desde` hasta el de `hasta`, ambos incluidos.
function mesesDelPeriodo({ desde, hasta }) {
  const meses = [];
  let [a, m] = desde.split("-").map(Number);
  const [af, mf] = hasta.split("-").map(Number);
  while (a < af || (a === af && m <= mf)) {
    meses.push(`${a}-${String(m).padStart(2, "0")}`);
    m += 1;
    if (m > 12) { m = 1; a += 1; }
  }
  return meses;
}

module.exports = { aISO, validarPeriodo, mesesDelPeriodo };
