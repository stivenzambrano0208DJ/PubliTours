// Cuándo ocurrió algo, dicho como lo diría una persona. Se compara por días del calendario local, no por bloques de 24 horas.
const DIAS = ["dom", "lun", "mar", "mié", "jue", "vie", "sáb"];
const inicioDelDia = (f) => new Date(f.getFullYear(), f.getMonth(), f.getDate());

// "ahora", "hace 5 min", "hace 3 h", "ayer", "mar" (esta semana) o "12 oct".
export function tiempoRelativo(fecha, ahora = new Date()) {
  const f = new Date(fecha);
  if (Number.isNaN(f.getTime())) return "";
  const minutos = Math.floor((ahora - f) / 60000);
  if (minutos < 1) return "ahora";
  if (minutos < 60) return `hace ${minutos} min`;
  const dias = Math.round((inicioDelDia(ahora) - inicioDelDia(f)) / 864e5);
  if (dias === 0) return `hace ${Math.floor(minutos / 60)} h`;
  if (dias === 1) return "ayer";
  if (dias < 7) return DIAS[f.getDay()];
  return f.toLocaleDateString("es-CO", { day: "numeric", month: "short" }).replace(".", "");
}

// "3:40 p. m." para la hora de un mensaje.
export const horaCorta = (fecha) => new Date(fecha).toLocaleTimeString("es-CO", { hour: "numeric", minute: "2-digit" });

// Encabezado de un grupo de mensajes del mismo día: "Hoy", "Ayer" o "12 de octubre".
export function etiquetaDia(fecha, ahora = new Date()) {
  const f = new Date(fecha);
  const dias = Math.round((inicioDelDia(ahora) - inicioDelDia(f)) / 864e5);
  if (dias === 0) return "Hoy";
  if (dias === 1) return "Ayer";
  return f.toLocaleDateString("es-CO", { day: "numeric", month: "long" });
}

export const mismoDia = (a, b) => inicioDelDia(new Date(a)).getTime() === inicioDelDia(new Date(b)).getTime();
