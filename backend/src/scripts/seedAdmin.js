// Crea (o promueve) el usuario administrador inicial del sistema.
// La clave se lee de la variable de entorno CLAVE_ADMIN (así no queda en el historial del terminal); por compatibilidad también
// se acepta como tercer argumento. Una cuenta nueva exige la misma regla que cambiar:clave: 12 caracteres o más, con letras y números.
// Bash:        CLAVE_ADMIN='una-clave-larga-y-unica-1' node src/scripts/seedAdmin.js correo@ejemplo.com "Nombre Admin"
// PowerShell:  $env:CLAVE_ADMIN = "una-clave-larga-y-unica-1"; node src/scripts/seedAdmin.js correo@ejemplo.com "Nombre Admin"; Remove-Item Env:CLAVE_ADMIN
require("dotenv").config();
const bcrypt = require("bcryptjs");
const { Usuario } = require("../models");
const { clavePermitida, LARGO_MINIMO } = require("../utils/claves");

async function seed() {
  const [correo, nombre, claveArgumento] = process.argv.slice(2);
  const password = process.env.CLAVE_ADMIN || claveArgumento;
  if (!correo || !nombre) {
    console.error('Uso: CLAVE_ADMIN="…" node src/scripts/seedAdmin.js correo@ejemplo.com "Nombre Admin"');
    return 1;
  }

  const existente = await Usuario.findOne({ where: { correo } });
  if (existente) {
    await existente.update({ rol: "administrador", correo_verificado: true });
    console.log(`Usuario existente '${correo}' promovido a administrador.`);
    return 0;
  }

  if (!clavePermitida(password)) {
    console.error(`✖ La clave del administrador debe estar en la variable CLAVE_ADMIN, tener al menos ${LARGO_MINIMO} caracteres e incluir letras y números.`);
    return 1;
  }
  await Usuario.create({ nombre, correo, password_hash: await bcrypt.hash(password, 10), rol: "administrador", correo_verificado: true });
  console.log(`Administrador '${correo}' creado correctamente.`);
  return 0;
}

seed().then((codigo) => process.exit(codigo)).catch((err) => { console.error(err.message); process.exit(1); });
