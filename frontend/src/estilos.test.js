import { describe, it, expect } from "vitest";
import fs from "node:fs";
import path from "node:path";
import { CAMPO, CAMPO_ANCHO, CAMPO_COMPACTO, CAMPO_AUTH, CAMPO_AUTH_ICONO } from "./estilos";

describe("estilos de los campos de formulario", () => {
  it("todos comparten la misma base de bordes, color y foco", () => {
    for (const clase of [CAMPO, CAMPO_ANCHO, CAMPO_COMPACTO]) {
      for (const token of ["rounded-xl", "bg-surface-container-low", "border-surface-container-high", "outline-none", "focus:border-secondary"]) {
        expect(clase.split(" ")).toContain(token);
      }
    }
  });
  it("las variantes solo cambian el tamaño", () => {
    expect(CAMPO.split(" ")).toEqual(expect.arrayContaining(["px-4", "py-2.5"]));
    expect(CAMPO_ANCHO.split(" ")).toContain("w-full");
    expect(CAMPO_COMPACTO.split(" ")).toEqual(expect.arrayContaining(["px-3", "py-2"]));
  });
  it("la variante con ícono deja espacio a la izquierda y conserva el resto", () => {
    expect(CAMPO_AUTH_ICONO.split(" ")).toEqual(expect.arrayContaining(["pl-11", "pr-4"]));
    expect(CAMPO_AUTH_ICONO.split(" ")).not.toContain("px-4");
    expect(CAMPO_AUTH_ICONO.replace("pl-11 pr-4", "px-4")).toBe(CAMPO_AUTH);
  });

  it("ninguna pantalla vuelve a definir su propia copia de las clases de los campos", () => {
    const raiz = path.join(__dirname);
    const archivos = [];
    const recorrer = (d) => { for (const e of fs.readdirSync(d, { withFileTypes: true })) { const p = path.join(d, e.name); if (e.isDirectory()) recorrer(p); else if (/\.jsx$/.test(e.name) && !/\.test\./.test(e.name)) archivos.push(p); } };
    recorrer(raiz);
    const conCopia = archivos.filter((f) => /^const INPUT(_ICONO)? = ["`]/m.test(fs.readFileSync(f, "utf8"))).map((f) => path.relative(raiz, f));
    expect(conCopia).toEqual([]);
  });
});
