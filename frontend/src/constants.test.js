import { describe, it, expect, afterEach, vi } from "vitest";
import { CATEGORIA_ICONOS, CATEGORIA_GRADIENTE, MUNICIPIOS_CAQUETA, CATEGORIAS_NEGOCIO, fechaMinima } from "./constants";
import { urlImagen } from "./api/client";

describe("constantes compartidas", () => {
  afterEach(() => vi.useRealTimers());

  it("fechaMinima devuelve mañana con formato AAAA-MM-DD", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-03-10T12:00:00"));
    expect(fechaMinima()).toBe("2026-03-11");
  });

  it("fechaMinima cruza el cambio de mes", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-01-31T12:00:00"));
    expect(fechaMinima()).toBe("2026-02-01");
  });

  it("toda categoría de negocio tiene ícono y gradiente", () => {
    for (const c of CATEGORIAS_NEGOCIO) {
      expect(CATEGORIA_ICONOS[c.value]).toBeTruthy();
      expect(CATEGORIA_GRADIENTE[c.value]).toBeTruthy();
    }
  });

  it("incluye los municipios principales del Caquetá sin duplicados", () => {
    expect(MUNICIPIOS_CAQUETA).toContain("Florencia");
    expect(MUNICIPIOS_CAQUETA).toContain("Belén de los Andaquíes");
    expect(new Set(MUNICIPIOS_CAQUETA).size).toBe(MUNICIPIOS_CAQUETA.length);
  });
});

describe("urlImagen", () => {
  it("antepone el origen del backend a la ruta guardada", () => {
    expect(urlImagen("/uploads/sitios/a.jpg")).toMatch(/^https?:\/\/.+\/uploads\/sitios\/a\.jpg$/);
  });

  it("devuelve null si no hay imagen", () => {
    expect(urlImagen(null)).toBeNull();
    expect(urlImagen("")).toBeNull();
  });
});
