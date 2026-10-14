import { describe, it, expect } from "vitest";
import { enlaceExterno, enlaceWhatsApp } from "./enlaces";

describe("enlaceExterno", () => {
  it("agrega https:// cuando solo escribieron el dominio", () => {
    expect(enlaceExterno("instagram.com/mifinca")).toBe("https://instagram.com/mifinca");
    expect(enlaceExterno("www.mifinca.co")).toBe("https://www.mifinca.co/");
  });

  it("respeta http y https", () => {
    expect(enlaceExterno("https://facebook.com/mifinca")).toBe("https://facebook.com/mifinca");
    expect(enlaceExterno("http://mifinca.co")).toBe("http://mifinca.co/");
  });

  it("rechaza esquemas peligrosos", () => {
    expect(enlaceExterno("javascript:alert(1)")).toBeNull();
    expect(enlaceExterno("data:text/html,<script>alert(1)</script>")).toBeNull();
    expect(enlaceExterno("ftp://mifinca.co")).toBeNull();
    expect(enlaceExterno("mailto:a@b.com")).toBeNull();
  });

  it("rechaza texto que no es un enlace", () => {
    expect(enlaceExterno("@mifinca en Instagram")).toBeNull(); // tiene espacios
    expect(enlaceExterno("mifinca")).toBeNull(); // sin punto, no es un dominio
    expect(enlaceExterno("")).toBeNull();
    expect(enlaceExterno(null)).toBeNull();
  });
});

describe("enlaceWhatsApp", () => {
  it("arma el enlace con el indicativo de Colombia", () => {
    expect(enlaceWhatsApp("3001234567")).toBe("https://wa.me/573001234567");
  });
  it("sin teléfono no hay enlace", () => {
    expect(enlaceWhatsApp(null)).toBeNull();
    expect(enlaceWhatsApp("")).toBeNull();
  });
});
