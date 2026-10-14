// Crea (o promueve) el usuario administrador inicial del sistema.
// Uso: node src/scripts/seedAdmin.js correo@ejemplo.com "Nombre Admin" password123
require("dotenv").config();
const bcrypt = require("bcryptjs");
const { Usuario } = require("../models");

async function seed() {
  const [correo, nombre, password] = process.argv.slice(2);
  if (!correo || !nombre || !password) {
    console.log('Uso: node src/scripts/seedAdmin.js correo@ejemplo.com "Nombre Admin" password123');
    process.exit(1);
  }


  let usuario = await Usuario.findOne({ where: { correo } });
  if (usuario) {
    await usuario.update({ rol: "administrador", correo_verificado: true });
    console.log(`Usuario existente '${correo}' promovido a administrador.`);
  } else {
    const password_hash = await bcrypt.hash(password, 10);
    usuario = await Usuario.create({ nombre, correo, password_hash, rol: "administrador", correo_verificado: true });
    console.log(`Administrador '${correo}' creado correctamente.`);
  }
  process.exit(0);
}

seed().catch(err => { console.error(err); process.exit(1); });
