import { describe, it, expect } from "vitest";
import fs from "node:fs";
import path from "node:path";
import EN from "./en";
import { traducir } from "../context/idioma";

// Todos los textos marcados con t('…') en el código, leídos de los archivos fuente.
function textosDelCodigo() {
  const raiz = path.resolve(__dirname, "..");
  const textos = new Map(); // texto → primer archivo donde aparece
  (function recorrer(dir) {
    for (const nombre of fs.readdirSync(dir)) {
      const ruta = path.join(dir, nombre);
      if (fs.statSync(ruta).isDirectory()) recorrer(ruta);
      else if (/\.jsx?$/.test(nombre) && !/\.test\./.test(nombre)) {
        const codigo = fs.readFileSync(ruta, "utf8");
        for (const [, texto] of codigo.matchAll(/\bt\(\s*"((?:[^"\\]|\\.)*)"/g)) {
          const limpio = JSON.parse(`"${texto}"`);
          if (!textos.has(limpio)) textos.set(limpio, path.relative(raiz, ruta));
        }
      }
    }
  })(raiz);
  return textos;
}

describe("traducciones", () => {
  const textos = textosDelCodigo();

  it("cada texto marcado con t() tiene su traducción al inglés", () => {
    const faltan = [...textos].filter(([texto]) => !EN[texto]).map(([texto, archivo]) => `${archivo}: ${texto}`);
    expect(faltan).toEqual([]);
  });

  it("el diccionario no tiene traducciones de textos que ya no existen", () => {
    const sobran = Object.keys(EN).filter((texto) => !textos.has(texto));
    expect(sobran).toEqual([]);
  });

  it("las traducciones conservan los mismos {marcadores} que el texto en español", () => {
    const marcas = (s) => [...s.matchAll(/\{(\w+)\}/g)].map((m) => m[1]).sort();
    const distintas = Object.entries(EN).filter(([es, en]) => marcas(es).join() !== marcas(en).join()).map(([es]) => es);
    expect(distintas).toEqual([]);
  });

  it("traduce, reemplaza los marcadores y, sin traducción, deja el español", () => {
    expect(traducir("es", "Hola, {nombre}", { nombre: "Ana" })).toBe("Hola, Ana");
    expect(traducir("en", "Texto que no existe en el diccionario")).toBe("Texto que no existe en el diccionario");
  });
});
