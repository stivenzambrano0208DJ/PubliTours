// Genera public/og.png (1200×630): la imagen que se ve al compartir un enlace de PubliTours en WhatsApp, redes y buscadores.
// Uso (con Google Chrome instalado): npm run imagen:compartir
import { chromium } from "@playwright/test";
import { fileURLToPath } from "node:url";
import path from "node:path";

const salida = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../public/og.png");

const html = `<!doctype html><html><head><meta charset="utf-8"><style>
  * { box-sizing: border-box; margin: 0; }
  body { width: 1200px; height: 630px; font-family: "Segoe UI", Arial, sans-serif; color: #fff; overflow: hidden;
    background: linear-gradient(135deg, #003527 0%, #064e3b 55%, #006c49 100%); position: relative; }
  .hoja { position: absolute; border-radius: 50%; background: rgba(111, 251, 190, 0.10); }
  .a { width: 620px; height: 620px; right: -160px; top: -200px; }
  .b { width: 380px; height: 380px; right: 120px; bottom: -190px; background: rgba(111, 251, 190, 0.08); }
  .contenido { position: relative; padding: 84px 90px; height: 100%; display: flex; flex-direction: column; justify-content: center; gap: 28px; }
  .marca { display: flex; align-items: center; gap: 26px; }
  .logo { width: 120px; height: 120px; border-radius: 28px; background: linear-gradient(45deg, #064e3b, #006c49); border: 3px solid rgba(255,255,255,.25);
    display: flex; align-items: center; justify-content: center; box-shadow: 0 18px 40px rgba(0,0,0,.28); }
  h1 { font-size: 112px; font-weight: 800; letter-spacing: -3px; line-height: 1; }
  .etiqueta { display: inline-block; margin-left: 18px; padding: 6px 18px; border-radius: 12px; font-size: 34px; font-weight: 800; letter-spacing: 1px;
    background: rgba(111, 251, 190, .22); color: #6ffbbe; vertical-align: 16px; }
  .lema { font-size: 50px; font-weight: 600; color: #6ffbbe; }
  .texto { font-size: 34px; line-height: 1.35; max-width: 860px; color: rgba(255,255,255,.88); }
  .pie { font-size: 26px; letter-spacing: 3px; text-transform: uppercase; color: rgba(255,255,255,.62); }
</style></head><body>
  <div class="hoja a"></div><div class="hoja b"></div>
  <div class="contenido">
    <div class="marca">
      <div class="logo"><svg viewBox="0 0 64 64" width="76" height="76"><path fill="#fff" d="M32 10 45 27h-7l10 13H36v10h-8V40H16l10-13h-7z"/></svg></div>
      <h1>PubliTours<span class="etiqueta">VIVE IA</span></h1>
    </div>
    <div class="lema">Caquetá Vive IA</div>
    <div class="texto">Planifica tu viaje con inteligencia artificial y reserva servicios verificados de la Amazonía colombiana.</div>
    <div class="pie">Caquetá · Puerta de Oro de la Amazonía</div>
  </div>
</body></html>`;

const navegador = await chromium.launch({ channel: "chrome" });
const pagina = await navegador.newPage({ viewport: { width: 1200, height: 630 } });
await pagina.setContent(html);
await pagina.screenshot({ path: salida, type: "png" });
await navegador.close();
console.log("Imagen creada:", salida);
