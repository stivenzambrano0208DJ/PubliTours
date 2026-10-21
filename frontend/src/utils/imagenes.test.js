import { describe, it, expect, vi } from "vitest";
import { ladoEscalado, prepararFoto, LADO_MAXIMO_FOTO } from "./imagenes";

describe("ladoEscalado", () => {
  it("reduce una foto de cámara de celular conservando la proporción", () => {
    expect(ladoEscalado(4000, 3000)).toEqual({ ancho: LADO_MAXIMO_FOTO, alto: 1440 });
    expect(ladoEscalado(3000, 4000)).toEqual({ ancho: 1440, alto: LADO_MAXIMO_FOTO });
  });
  it("no agranda ni toca una foto que ya es pequeña", () => {
    expect(ladoEscalado(1200, 800)).toEqual({ ancho: 1200, alto: 800 });
    expect(ladoEscalado(LADO_MAXIMO_FOTO, 500)).toEqual({ ancho: LADO_MAXIMO_FOTO, alto: 500 });
  });
});

describe("prepararFoto", () => {
  it("no toca un GIF (puede estar animado)", async () => {
    const gif = new File(["GIF89a"], "a.gif", { type: "image/gif" });
    expect(await prepararFoto(gif)).toBe(gif);
  });
  it("si la foto no se puede leer o procesar, devuelve la original y nunca impide subirla", async () => {
    vi.useFakeTimers(); // en este entorno el navegador simulado nunca dispara "cargó" ni "error": solo el tiempo límite rescata
    try {
      const rota = new File([new Uint8Array(600 * 1024)], "rota.jpg", { type: "image/jpeg" });
      const espera = prepararFoto(rota);
      await vi.advanceTimersByTimeAsync(9000);
      expect(await espera).toBe(rota);
    } finally {
      vi.useRealTimers();
    }
  });
  it("una foto pequeña se manda tal cual, sin recomprimirla ni esperar", async () => {
    const chica = new File([new Uint8Array(100 * 1024)], "chica.jpg", { type: "image/jpeg" });
    expect(await prepararFoto(chica)).toBe(chica);
  });
  it("tolera que no haya archivo", async () => {
    expect(await prepararFoto(undefined)).toBeUndefined();
  });
});
