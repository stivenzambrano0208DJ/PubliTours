// Cambia la contraseña de una cuenta (por ejemplo, la del administrador de desarrollo) y cierra todas sus sesiones abiertas.
// (seed:admin no sirve para esto: si la cuenta ya existe solo la promueve, no toca su contraseña.)
//
// La contraseña se lee de la variable de entorno NUEVA_CLAVE y no de un argumento, para que no quede en el historial del terminal.
// PowerShell:  $env:NUEVA_CLAVE = "una-clave-larga-y-unica"; npm run cambiar:clave -- correo@ejemplo.com; Remove-Item Env:NUEVA_CLAVE
// Bash:        NUEVA_CLAVE='una-clave-larga-y-unica' npm run cambiar:clave -- correo@ejemplo.com
require("dotenv").config();
const bcrypt = require("bcryptjs");
const { Usuario } = require("../models");

// Mínimo exigido a las cuentas con permisos: largo, y no solo letras ni solo números.
const clavePermitida = (c) => typeof c === "string" && c.length >= 12 && /[A-Za-z]/.test(c) && /\d/.test(c);

async function cambiar() {
  const correo = process.argv[2];
  const clave = process.env.NUEVA_CLAVE;
  if (!correo) { console.error("Uso: NUEVA_CLAVE='…' npm run cambiar:clave -- correo@ejemplo.com"); return 1; }
  if (!clavePermitida(clave)) {
    console.error("✖ La nueva clave debe estar en la variable NUEVA_CLAVE, tener al menos 12 caracteres e incluir letras y números.");
    return 1;
  }
  const usuario = await Usuario.findOne({ where: { correo } });
  if (!usuario) { console.error(`✖ No existe una cuenta con el correo ${correo}.`); return 1; }

  // Subir la versión de sesión cierra todas las sesiones abiertas con la clave anterior (misma regla que el cambio desde la aplicación).
  await usuario.update({ password_hash: await bcrypt.hash(clave, 10), token_version: usuario.token_version + 1 });
  console.log(`✔ Contraseña de ${correo} (${usuario.rol}) actualizada; sus sesiones abiertas se cerraron.`);
  return 0;
}

cambiar().then((codigo) => process.exit(codigo)).catch((err) => { console.error(err.message); process.exit(1); });
