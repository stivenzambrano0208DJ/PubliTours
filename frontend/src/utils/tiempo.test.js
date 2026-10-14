import { describe, it, expect } from "vitest";
import { tiempoRelativo, etiquetaDia, mismoDia, horaCorta } from "./tiempo";

// Miércoles 14 de octubre de 2026, 3:40 p. m. (hora local de la prueba)
const AHORA = new Date(2026, 9, 14, 15, 40, 0);
const hace = (min) => new Date(AHORA.getTime() - min * 60000);

describe("tiempoRelativo", () => {
  it("minutos, horas, ayer, día de la semana y fecha", () => {
    expect(tiempoRelativo(hace(0), AHORA)).toBe("ahora");
    expect(tiempoRelativo(hace(0.5), AHORA)).toBe("ahora");
    expect(tiempoRelativo(hace(1), AHORA)).toBe("hace 1 min");
    expect(tiempoRelativo(hace(59), AHORA)).toBe("hace 59 min");
    expect(tiempoRelativo(hace(60), AHORA)).toBe("hace 1 h");
    expect(tiempoRelativo(new Date(2026, 9, 14, 8, 0), AHORA)).toBe("hace 7 h");
    expect(tiempoRelativo(new Date(2026, 9, 13, 23, 50), AHORA)).toBe("ayer"); // ayer a las 11:50 p. m. (menos de 24 h, pero otro día)
    expect(tiempoRelativo(new Date(2026, 9, 13, 9, 0), AHORA)).toBe("ayer");
    expect(tiempoRelativo(new Date(2026, 9, 11, 9, 0), AHORA)).toBe("dom"); // hace 3 días: 11 de octubre de 2026 fue domingo
    expect(tiempoRelativo(new Date(2026, 9, 1, 9, 0), AHORA)).toMatch(/^1 de oct/);
  });

  it("no se rompe con fechas inválidas", () => {
    expect(tiempoRelativo("no-es-fecha", AHORA)).toBe("");
    expect(tiempoRelativo(undefined, AHORA)).toBe("");
  });

  it("acepta fechas en texto ISO, como las manda el servidor", () => {
    expect(tiempoRelativo(hace(5).toISOString(), AHORA)).toBe("hace 5 min");
  });
});

describe("etiquetaDia y mismoDia", () => {
  it("Hoy, Ayer o la fecha", () => {
    expect(etiquetaDia(new Date(2026, 9, 14, 1, 0), AHORA)).toBe("Hoy");
    expect(etiquetaDia(new Date(2026, 9, 13, 20, 0), AHORA)).toBe("Ayer");
    expect(etiquetaDia(new Date(2026, 9, 2, 20, 0), AHORA)).toMatch(/^2 de octubre/);
  });
  it("compara por día del calendario, no por horas", () => {
    expect(mismoDia(new Date(2026, 9, 14, 0, 1), new Date(2026, 9, 14, 23, 59))).toBe(true);
    expect(mismoDia(new Date(2026, 9, 14, 23, 59), new Date(2026, 9, 15, 0, 1))).toBe(false);
  });
});

describe("horaCorta", () => {
  it("muestra hora y minutos", () => {
    expect(horaCorta(new Date(2026, 9, 14, 15, 40))).toMatch(/3:40/);
  });
});
