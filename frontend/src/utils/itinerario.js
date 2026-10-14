import { fechaDelDia, fechaCorta } from "./fechas";
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
export function textoItinerario({ itinerario, fechaInicio, personas }) {
  const lineas = [
    "Mi itinerario en el Caquetá (PubliTours)",
    `${itinerario.dias} día(s) · ${personas} persona${personas === 1 ? "" : "s"} · desde el ${fechaCorta(fechaInicio)}`,
    "",
  ];
  for (const { dia, items } of itemsPorDia(itinerario.items)) {
    lineas.push(`Día ${dia} · ${fechaCorta(fechaDelDia(fechaInicio, dia))}`);
    for (const { sitio } of items) {
      const precio = Number(sitio.precio) === 0 ? "gratis" : `${pesos(Number(sitio.precio) * personas)}`;
      lineas.push(`- ${sitio.nombre} (${sitio.municipio}) — ${precio}`);
    }
    lineas.push("");
  }
  lineas.push(`Total estimado: ${pesos(totalEstimado(itinerario.items, personas))} COP`);
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
