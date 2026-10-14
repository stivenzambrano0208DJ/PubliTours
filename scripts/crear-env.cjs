// Crea el archivo .env de la carpeta raíz (el que usa docker compose) a partir de .env.example, con secretos NUEVOS y aleatorios
// para la base de datos y las sesiones. Los valores no se muestran en pantalla; quedan solo en el archivo.
//
// No sobrescribe un .env que ya exista. Uso (desde la carpeta raíz):  node scripts/crear-env.cjs
// Después completa a mano EMAIL_USER y EMAIL_PASS (contraseña de aplicación de Gmail) y, si vas a publicar el sitio, CORS_ORIGIN.
const fs = require("node:fs");
const path = require("node:path");
const crypto = require("node:crypto");

const raiz = path.join(__dirname, "..");
const destino = path.join(raiz, ".env");
const plantilla = path.join(raiz, ".env.example");

if (fs.existsSync(destino)) {
  console.error("✖ Ya existe un .env en esta carpeta: no lo sobrescribo. Bórralo (o renómbralo) si quieres generar uno nuevo.");
  process.exit(1);
}

const secretos = {
  DB_PASSWORD: crypto.randomBytes(24).toString("base64url"), // 32 caracteres sin símbolos que rompan una URL o el shell
  JWT_SECRET: crypto.randomBytes(48).toString("hex"), // 96 caracteres: firma las sesiones
};

const contenido = fs.readFileSync(plantilla, "utf8").replace(/^(DB_PASSWORD|JWT_SECRET)=.*$/gm, (_, clave) => `${clave}=${secretos[clave]}`);
fs.writeFileSync(destino, contenido, { mode: 0o600 });

console.log("✔ .env creado con una contraseña de base de datos y un JWT_SECRET nuevos (no se muestran).");
console.log("  Falta completar a mano: EMAIL_USER y EMAIL_PASS. Revisa también CORS_ORIGIN y PUERTO_WEB.");
