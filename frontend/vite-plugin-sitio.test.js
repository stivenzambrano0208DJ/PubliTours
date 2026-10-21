import { describe, it, expect, vi } from "vitest";
import sitio, { robotsTxt, sitemapXml, normalizarUrl, RUTAS_PRIVADAS, RUTAS_PUBLICAS, SITIO_URL_POR_DEFECTO } from "./vite-plugin-sitio";

describe("datos del sitio que dependen del dominio", () => {
  it("usa la dirección de producción por defecto y quita la barra final", () => {
    expect(normalizarUrl(undefined)).toBe(SITIO_URL_POR_DEFECTO);
    expect(normalizarUrl("https://otro.com///")).toBe("https://otro.com");
  });

  it("sustituye __SITIO_URL__ en el HTML, en todas las apariciones", () => {
    const html = '<meta property="og:url" content="__SITIO_URL__/" /><meta property="og:image" content="__SITIO_URL__/og.png" />';
    const resultado = sitio({ VITE_SITIO_URL: "https://ejemplo.co/" }).transformIndexHtml(html);
    expect(resultado).toBe('<meta property="og:url" content="https://ejemplo.co/" /><meta property="og:image" content="https://ejemplo.co/og.png" />');
  });

  it("robots.txt permite el sitio, oculta las páginas privadas y apunta al mapa del sitio", () => {
    const txt = robotsTxt("https://ejemplo.co");
    expect(txt).toContain("User-agent: *\nAllow: /");
    for (const r of RUTAS_PRIVADAS) expect(txt).toContain(`Disallow: ${r}\n`);
    expect(txt).toContain("Sitemap: https://ejemplo.co/sitemap.xml");
  });

  it("sitemap.xml lista las páginas públicas con dirección absoluta y ninguna privada", () => {
    const xml = sitemapXml("https://ejemplo.co");
    expect(xml.startsWith('<?xml version="1.0" encoding="UTF-8"?>')).toBe(true);
    expect(xml).toContain("<loc>https://ejemplo.co/</loc>");
    expect(xml).toContain("<loc>https://ejemplo.co/explorar</loc>");
    expect((xml.match(/<url>/g) || []).length).toBe(RUTAS_PUBLICAS.length);
    for (const r of RUTAS_PRIVADAS) expect(xml).not.toContain(`${r}</loc>`);
  });

  it("emite robots.txt y sitemap.xml al compilar", () => {
    const emitFile = vi.fn();
    sitio({ VITE_SITIO_URL: "https://ejemplo.co" }).generateBundle.call({ emitFile });
    expect(emitFile.mock.calls.map(([a]) => a.fileName)).toEqual(["robots.txt", "sitemap.xml"]);
    expect(emitFile.mock.calls[0][0].source).toContain("https://ejemplo.co/sitemap.xml");
  });
});
