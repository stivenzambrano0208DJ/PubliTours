import { describe, it, expect } from "vitest";
import { admitirFotos } from "./fotos";

const archivo = (tipo, mb = 0.1, nombre = "f") => ({ type: tipo, size: mb * 1024 * 1024, name: nombre });
const LIMITES = { max: 3, maxMb: 5 };

describe("admitirFotos", () => {
  it("acepta JPG, PNG, WEBP y GIF dentro de los límites", () => {
    const nuevas = ["image/jpeg", "image/png", "image/webp"].map((t) => archivo(t));
    expect(admitirFotos([], nuevas, LIMITES)).toEqual({ aceptadas: nuevas, error: "" });
    expect(admitirFotos([], [archivo("image/gif")], LIMITES).aceptadas).toHaveLength(1);
  });

  it("rechaza lo que no es una foto permitida y lo explica", () => {
    for (const tipo of ["application/pdf", "text/html", "image/svg+xml", "image/bmp", ""]) {
      const r = admitirFotos([], [archivo(tipo)], LIMITES);
      expect(r.aceptadas).toEqual([]);
      expect(r.error).toBe("Solo se aceptan fotos JPG, PNG, WEBP o GIF.");
    }
  });

  it("rechaza fotos que pesan más del tope, pero deja pasar la que está justo en él", () => {
    expect(admitirFotos([], [archivo("image/png", 5.01)], LIMITES).error).toBe("Cada foto puede pesar hasta 5 MB.");
    expect(admitirFotos([], [archivo("image/png", 5)], LIMITES).aceptadas).toHaveLength(1);
  });

  it("respeta el máximo de fotos contando las que ya estaban elegidas", () => {
    const ya = [archivo("image/png"), archivo("image/png")];
    const r = admitirFotos(ya, [archivo("image/png", 0.1, "tercera"), archivo("image/png", 0.1, "cuarta")], LIMITES);
    expect(r.aceptadas.map((f) => f.name)).toEqual(["tercera"]);
    expect(r.error).toBe("Puedes adjuntar hasta 3 fotos por mensaje.");
  });

  it("singular cuando solo se permite una", () => {
    expect(admitirFotos([archivo("image/png")], [archivo("image/png")], { max: 1, maxMb: 5 }).error).toBe("Puedes adjuntar hasta 1 foto por mensaje.");
  });

  it("conserva las válidas aunque otras del mismo grupo no sirvan", () => {
    const buena = archivo("image/jpeg", 1, "buena");
    const r = admitirFotos([], [archivo("application/pdf"), buena], LIMITES);
    expect(r.aceptadas).toEqual([buena]);
    expect(r.error).toMatch(/Solo se aceptan fotos/);
  });
});
