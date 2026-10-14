import { describe, it, expect } from "vitest";
import { resumenItinerario } from "./itinerario";

const item = (id, municipio, precio, score) => ({ id, dia: 1, score, sitio: { municipio, precio } });

describe("resumenItinerario", () => {
  it("saca municipios únicos, el total para el grupo y el puntaje promedio redondeado", () => {
    const itinerario = { items: [item(1, "Morelia", "0", 80), item(2, "Belén", "30000", 61), item(3, "Morelia", "15000", 70)] };
    expect(resumenItinerario(itinerario, 2)).toEqual({
      municipios: ["Morelia", "Belén"],
      presupuestoUsado: 90000, // (0 + 30.000 + 15.000) × 2
      puntajePromedio: 70, // (80 + 61 + 70) / 3 = 70,33
    });
  });

  it("un itinerario sin actividades da ceros, sin dividir por cero", () => {
    expect(resumenItinerario({ items: [] }, 3)).toEqual({ municipios: [], presupuestoUsado: 0, puntajePromedio: 0 });
  });
});
