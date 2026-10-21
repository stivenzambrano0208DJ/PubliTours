import { defineConfig } from "@playwright/test";
import { VIDEO_CAMARA } from "./e2e/rutas.mjs";

// Pruebas de punta a punta: levantan su propio backend (puerto 4100, base de pruebas) y frontend (puerto 5174),
// así nunca tocan los datos reales de desarrollo.
const BACKEND_PORT = 4100;
const FRONTEND_PORT = 5174;

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: false,
  workers: 1,
  // El ejecutor del CI es más lento que un PC: más margen, un reintento por si una espera justa falla, y el reportero "github"
  // deja el nombre de la prueba y el error como anotaciones del job (legibles sin iniciar sesión en GitHub).
  timeout: process.env.CI ? 150_000 : 90_000,
  expect: { timeout: process.env.CI ? 40_000 : 20_000 },
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? [["list"], ["github"], ["html", { open: "never" }]] : [["list"], ["html", { open: "never" }]],
  use: {
    baseURL: `http://localhost:${FRONTEND_PORT}`,
    viewport: { width: 1440, height: 900 }, // el menú de usuario del encabezado aparece desde 1280 px
    channel: "chrome", // usa el Google Chrome instalado; no hay que descargar navegadores
    permissions: ["camera"],
    launchOptions: { args: ["--use-fake-device-for-media-stream", "--use-fake-ui-for-media-stream", `--use-file-for-fake-video-capture=${VIDEO_CAMARA}`] },
    trace: process.env.CI ? "on-first-retry" : "retain-on-failure",
    screenshot: "only-on-failure",
  },
  webServer: [
    {
      command: "node e2e/arrancar-backend.mjs",
      port: BACKEND_PORT,
      timeout: 120_000,
      reuseExistingServer: false,
      stdout: "pipe",
      stderr: "pipe",
    },
    {
      command: `npx vite --port ${FRONTEND_PORT} --strictPort`,
      port: FRONTEND_PORT,
      timeout: 120_000,
      reuseExistingServer: false,
      env: { VITE_API_ORIGIN: `http://localhost:${BACKEND_PORT}` },
    },
  ],
});
