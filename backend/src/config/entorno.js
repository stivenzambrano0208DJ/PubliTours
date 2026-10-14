// Comprueba la configuración al arrancar para fallar rápido y con un mensaje claro, en vez de caerse más tarde con un error confuso.
const PLACEHOLDERS = ["cambia_este_secreto", "cambia_esta_contraseña", "changeme", "secret"];

// Devuelve la lista de problemas encontrados (vacía si todo está bien). No lee process.env por sí sola para poder probarla.
function validarEntorno(env = process.env) {
  const problemas = [];
  const produccion = env.NODE_ENV === "production";

  for (const clave of ["DB_NAME", "DB_USER", "DB_PASSWORD", "JWT_SECRET"]) {
    if (!env[clave]) problemas.push(`Falta ${clave} en el entorno (.env).`);
  }

  if (produccion) {
    if (env.JWT_SECRET && (env.JWT_SECRET.length < 32 || PLACEHOLDERS.includes(env.JWT_SECRET))) {
      problemas.push("JWT_SECRET debe ser largo y aleatorio en producción (mínimo 32 caracteres). Genera uno con: node -e \"console.log(require('crypto').randomBytes(48).toString('hex'))\"");
    }
    if (env.DB_PASSWORD && PLACEHOLDERS.includes(env.DB_PASSWORD)) problemas.push("DB_PASSWORD no puede ser el valor de ejemplo en producción.");
    if (!env.EMAIL_USER || !env.EMAIL_PASS) problemas.push("Faltan EMAIL_USER y EMAIL_PASS en producción: sin correo configurado los códigos de verificación se imprimirían en los registros.");
    if (!env.CORS_ORIGIN) problemas.push("Falta CORS_ORIGIN en producción: indica el origen del frontend (p. ej. https://publitours.example.com).");
  }
  return problemas;
}

// Opciones de CORS: en desarrollo cualquier origen; en producción solo los de CORS_ORIGIN (separados por coma).
function opcionesCors(env = process.env) {
  // credentials: la aplicación web envía su cookie de sesión (por eso el origen nunca puede ser "*").
  if (env.CORS_ORIGIN) return { origin: env.CORS_ORIGIN.split(",").map((o) => o.trim()).filter(Boolean), credentials: true };
  return { origin: env.NODE_ENV !== "production", credentials: true };
}

module.exports = { validarEntorno, opcionesCors };
