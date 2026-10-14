const aISO = (d) => d.toLocaleDateString("en-CA");

// Mismo criterio que el servidor: los últimos 6 meses más el actual completo (hasta fin de mes, para incluir lo que viene).
export function periodoInicial() {
  const hoy = new Date();
  return { desde: aISO(new Date(hoy.getFullYear(), hoy.getMonth() - 5, 1)), hasta: aISO(new Date(hoy.getFullYear(), hoy.getMonth() + 1, 0)) };
}

const NOMBRES_MES = ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic"];
// "2031-03" -> "mar 31"
export const etiquetaMes = (mes) => `${NOMBRES_MES[Number(mes.slice(5, 7)) - 1]} ${mes.slice(2, 4)}`;
