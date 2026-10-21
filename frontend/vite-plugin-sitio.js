// Datos del sitio que dependen del dominio, en un solo lugar: la dirección pública sale de VITE_SITIO_URL (por defecto, la de producción).
//  - Sustituye __SITIO_URL__ en index.html (etiquetas para compartir enlaces en WhatsApp, redes y buscadores).
//  - Genera robots.txt y sitemap.xml con esa misma dirección, para que nunca se desajusten.
export const SITIO_URL_POR_DEFECTO = "https://djstevenmix.online";

// Páginas que cualquiera puede ver. Los servicios y paquetes tienen su propia dirección (/sitios/:id, /paquetes/:id) y no se listan aquí.
export const RUTAS_PUBLICAS = ["/", "/explorar", "/paquetes", "/conviertete-en-prestador", "/ayuda", "/terminos", "/privacidad"];
// Páginas privadas: no deben aparecer en buscadores.
export const RUTAS_PRIVADAS = ["/admin", "/mi-negocio", "/mensajes", "/mis-reservas", "/perfil", "/itinerario", "/comprobante", "/plan"];

export const normalizarUrl = (url) => (url || SITIO_URL_POR_DEFECTO).replace(/\/+$/, "");

export const robotsTxt = (url) =>
  ["User-agent: *", "Allow: /", ...RUTAS_PRIVADAS.map((r) => `Disallow: ${r}`), "", `Sitemap: ${url}/sitemap.xml`, ""].join("\n");

export const sitemapXml = (url) =>
  `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n` +
  RUTAS_PUBLICAS.map((r) => `  <url><loc>${url}${r === "/" ? "/" : r}</loc></url>`).join("\n") +
  `\n</urlset>\n`;

export default function sitio(env = process.env) {
  const url = normalizarUrl(env.VITE_SITIO_URL);
  return {
    name: "publitours-sitio",
    transformIndexHtml: (html) => html.replaceAll("__SITIO_URL__", url),
    generateBundle() {
      this.emitFile({ type: "asset", fileName: "robots.txt", source: robotsTxt(url) });
      this.emitFile({ type: "asset", fileName: "sitemap.xml", source: sitemapXml(url) });
    },
  };
}
