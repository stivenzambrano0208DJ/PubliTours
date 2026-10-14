import { createRequire } from "node:module";
import path from "node:path";
import { fileURLToPath } from "node:url";

// Configuración compartida por el arranque del backend y las pruebas.
export const BACKEND_DIR = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../backend");
// Base de pruebas (se reconstruye en cada ejecución; nunca la base de desarrollo). Cambiable con E2E_DB_NAME.
export const E2E_DB = process.env.E2E_DB_NAME || "publitours_test";
export const BACKEND_PORT = 4100;
export const ADMIN = { correo: "admin-e2e@test.com", password: "AdminE2E123", nombre: "Admin E2E" };

const requireBackend = createRequire(path.join(BACKEND_DIR, "package.json"));
export const pg = requireBackend("pg");
export const bcrypt = requireBackend("bcryptjs");
requireBackend("dotenv").config({ path: path.join(BACKEND_DIR, ".env"), quiet: true });

export const conexion = (database) =>
  new pg.Client({
    host: process.env.DB_HOST, port: process.env.DB_PORT, user: process.env.DB_USER, password: process.env.DB_PASSWORD, database,
  });

// Ejecuta una consulta en la base de pruebas e2e (las pruebas la usan para "envejecer" una reserva).
export async function consultar(sql, params = []) {
  const c = conexion(E2E_DB);
  await c.connect();
  try { return await c.query(sql, params); } finally { await c.end(); }
}
