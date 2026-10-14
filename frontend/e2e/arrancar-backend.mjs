// Prepara una base limpia (publitours_e2e), crea un administrador conocido y arranca el backend en el puerto 4100.
import { spawn, spawnSync } from "node:child_process";
import { BACKEND_DIR, E2E_DB, BACKEND_PORT, ADMIN, conexion, bcrypt } from "./entorno.mjs";

const admin = conexion("postgres");
await admin.connect();
const existe = await admin.query("SELECT 1 FROM pg_database WHERE datname = $1", [E2E_DB]);
if (existe.rowCount === 0) await admin.query(`CREATE DATABASE ${E2E_DB}`);
await admin.end();

const env = { ...process.env, DB_NAME: E2E_DB, NODE_ENV: "test", PORT: String(BACKEND_PORT), EMAIL_USER: "", EMAIL_PASS: "", ANTHROPIC_API_KEY: "" };
for (const args of [["db:migrate:undo:all"], ["db:migrate"]]) {
  const r = spawnSync("npx", ["sequelize-cli", ...args], { cwd: BACKEND_DIR, env, stdio: "inherit", shell: true });
  if (r.status !== 0) process.exit(1);
}

const bd = conexion(E2E_DB);
await bd.connect();
await bd.query(
  "INSERT INTO usuarios (nombre, correo, password_hash, rol, fecha_registro, correo_verificado) VALUES ($1, $2, $3, 'administrador', NOW(), true)",
  [ADMIN.nombre, ADMIN.correo, bcrypt.hashSync(ADMIN.password, 10)]
);
await bd.end();

const servidor = spawn("node", ["src/server.js"], { cwd: BACKEND_DIR, env, stdio: "inherit" });
servidor.on("exit", (codigo) => process.exit(codigo ?? 0));
for (const senal of ["SIGINT", "SIGTERM"]) process.on(senal, () => servidor.kill());
