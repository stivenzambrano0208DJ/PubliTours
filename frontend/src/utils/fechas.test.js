import { describe, it, expect } from "vitest";
import { fechaDelDia, fechaCorta } from "./fechas";

describe("fechas del itinerario", () => {
  it("el día 1 es la fecha de inicio y cada día suma uno", () => {
    expect(fechaDelDia("2030-03-10", 1)).toBe("2030-03-10");
    expect(fechaDelDia("2030-03-10", 3)).toBe("2030-03-12");
  });

  it("cruza cambios de mes y de año", () => {
    expect(fechaDelDia("2030-01-30", 3)).toBe("2030-02-01");
    expect(fechaDelDia("2030-12-31", 2)).toBe("2031-01-01");
    expect(fechaDelDia("2032-02-28", 2)).toBe("2032-02-29"); // año bisiesto
  });

  it("acepta el día como texto", () => {
    expect(fechaDelDia("2030-03-10", "2")).toBe("2030-03-11");
  });

  it("fechaCorta muestra el día correcto sin desfase de zona horaria", () => {
    const texto = fechaCorta("2030-11-12"); // martes 12 de noviembre de 2030
    expect(texto).toMatch(/12/);
    expect(texto.toLowerCase()).toMatch(/nov/);
    expect(texto.toLowerCase()).toMatch(/mar/);
  });
});
