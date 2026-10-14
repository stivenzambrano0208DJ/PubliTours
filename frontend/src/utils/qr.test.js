import { describe, it, expect } from "vitest";
import { extraerCodigo } from "./qr";

describe("extraerCodigo", () => {
  it("lee el código de la dirección que guarda el QR del comprobante", () => {
    expect(extraerCodigo("https://publitours.example.com/verificar/PT-AB23CD")).toBe("PT-AB23CD");
    expect(extraerCodigo("http://localhost:5173/verificar/PT-AB23CD")).toBe("PT-AB23CD");
    expect(extraerCodigo("https://x.com/verificar/PT-AB23CD?utm=1#algo")).toBe("PT-AB23CD");
  });

  it("acepta el código escrito a mano, sin importar mayúsculas ni espacios", () => {
    expect(extraerCodigo("PT-AB23CD")).toBe("PT-AB23CD");
    expect(extraerCodigo("  pt-ab23cd \n")).toBe("PT-AB23CD");
  });

  it("rechaza lo que no es un código de PubliTours", () => {
    for (const malo of [
      "", "   ", null, undefined, 42, {},
      "hola", "PT-", "PT-AB23C", "PT-AB23CDE", // largo incorrecto
      "PT-AB0OCD", "PT-AB1ICD", // caracteres que el alfabeto excluye (0, O, 1, I)
      "https://otro.com/producto/123", "https://x.com/verificar/", "https://x.com/verificar/%E0%A4%A", // dirección ajena o mal codificada
      "XX-AB23CD", "PT_AB23CD",
      "PT-AB23CD".repeat(60), // demasiado largo para ser un código
    ]) expect(extraerCodigo(malo), String(malo).slice(0, 30)).toBeNull();
  });

  it("no se deja engañar por un código dentro de otra ruta o texto", () => {
    expect(extraerCodigo("mira PT-AB23CD aquí")).toBeNull();
    expect(extraerCodigo("https://x.com/otra/PT-AB23CD")).toBeNull();
  });
});
