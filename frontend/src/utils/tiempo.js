// Cuándo ocurrió algo, dicho como lo diría una persona. Se compara por días del calendario local, no por bloques de 24 horas.
// Cada función acepta el idioma (por defecto español).
import { traducir, LOCALES } from "../context/idioma";

const DIAS = ["dom", "lun", "mar", "mié", "jue", "vie", "sáb"];
const inicioDelDia = (f) => new Date(f.getFullYear(), f.getMonth(), f.getDate());

// t("ahora"), "hace 5 min", "hace 3 h", t("ayer"), "mar" (esta semana) o "12 oct".
export function tiempoRelativo(fecha, ahora = new Date(), idioma = "es") {
  const t = (texto, valores) => traducir(idioma, texto, valores);
  const f = new Date(fecha);
  if (Number.isNaN(f.getTime())) return "";
  const minutos = Math.floor((ahora - f) / 60000);
  if (minutos < 1) return t("ahora");
  if (minutos < 60) return t("hace {n} min", { n: minutos });
  const dias = Math.round((inicioDelDia(ahora) - inicioDelDia(f)) / 864e5);
  if (dias === 0) return t("hace {n} h", { n: Math.floor(minutos / 60) });
  if (dias === 1) return t("ayer");
  if (dias < 7) return idioma === "es" ? DIAS[f.getDay()] : f.toLocaleDateString(LOCALES[idioma], { weekday: "short" });
  return f.toLocaleDateString(LOCALES[idioma], { day: "numeric", month: "short" }).replace(".", "");
}

// "3:40 p. m." para la hora de un mensaje.
export const horaCorta = (fecha, idioma = "es") => new Date(fecha).toLocaleTimeString(LOCALES[idioma], { hour: "numeric", minute: "2-digit" });

// Encabezado de un grupo de mensajes del mismo día: t("Hoy"), t("Ayer") o "12 de octubre".
export function etiquetaDia(fecha, ahora = new Date(), idioma = "es") {
  const t = (texto) => traducir(idioma, texto);
  const f = new Date(fecha);
  const dias = Math.round((inicioDelDia(ahora) - inicioDelDia(f)) / 864e5);
  if (dias === 0) return t("Hoy");
  if (dias === 1) return t("Ayer");
  return f.toLocaleDateString(LOCALES[idioma], { day: "numeric", month: "long" });
}

export const mismoDia = (a, b) => inicioDelDia(new Date(a)).getTime() === inicioDelDia(new Date(b)).getTime();
