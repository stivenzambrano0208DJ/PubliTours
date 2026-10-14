// Formato de pesos colombianos que usa toda la interfaz.
export const pesos = (n) => `$${Number(n).toLocaleString("es-CO")}`;
// Abreviado para los ejes de las gráficas: $1,2 M / $350 mil
export const pesosCortos = (n) => (n >= 1e6 ? `$${(n / 1e6).toFixed(1).replace(".", ",")} M` : n >= 1e3 ? `$${Math.round(n / 1e3)} mil` : pesos(n));
