import { fechaDelDia, fechaCorta } from "./fechas";
import { traducir, LOCALES } from "../context/idioma";
import { pesos } from "./moneda";


// Agrupa las actividades por día del plan, en orden.
export function itemsPorDia(items) {
  const dias = {};
  for (const item of items) (dias[item.dia] ||= []).push(item);
  return Object.keys(dias).sort((a, b) => a - b).map((dia) => ({ dia: Number(dia), items: dias[dia] }));
}

// Total estimado del grupo: cada servicio cuesta su precio por persona.
export const totalEstimado = (items, personas) => items.reduce((suma, i) => suma + Number(i.sitio.precio), 0) * personas;

// El itinerario como texto plano para compartir por WhatsApp, correo o donde sea. Solo datos reales del plan.
export function textoItinerario({ itinerario, fechaInicio, personas }, idioma = "es") {
  const t = (texto, valores) => traducir(idioma, texto, valores);
  const locale = LOCALES[idioma];
  const lineas = [
    t("Mi itinerario en el Caquetá (PubliTours)"),
    `${t("{n} día(s)", { n: itinerario.dias })} · ${personas === 1 ? t("1 persona") : t("{n} personas", { n: personas })} · ${t("desde el {fecha}", { fecha: fechaCorta(fechaInicio, locale) })}`,
    "",
  ];
  for (const { dia, items } of itemsPorDia(itinerario.items)) {
    lineas.push(`${t("Día {n}", { n: dia })} · ${fechaCorta(fechaDelDia(fechaInicio, dia), locale)}`);
    for (const { sitio } of items) {
      const precio = Number(sitio.precio) === 0 ? t("gratis") : `${pesos(Number(sitio.precio) * personas)}`;
      lineas.push(`- ${sitio.nombre} (${sitio.municipio}) — ${precio}`);
    }
    lineas.push("");
  }
  lineas.push(t("Total estimado: {valor} COP", { valor: pesos(totalEstimado(itinerario.items, personas)) }));
  return lineas.join("\n");
}

// Cifras del resumen de un itinerario generado, todas calculadas con sus actividades reales.
export function resumenItinerario(itinerario, personas) {
  const { items } = itinerario;
  return {
    municipios: [...new Set(items.map((i) => i.sitio.municipio))],
    presupuestoUsado: totalEstimado(items, personas),
    puntajePromedio: items.length ? Math.round(items.reduce((suma, i) => suma + Number(i.score), 0) / items.length) : 0,
  };
}
