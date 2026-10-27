require("dotenv").config();

// Las pruebas crean y borran datos: jamás deben correr contra la base de desarrollo. Usa `npm test`, que apunta a publitours_test.
if (!(process.env.DB_NAME || "").endsWith("_test")) {
  throw new Error(`Las pruebas solo pueden usar una base terminada en "_test" (DB_NAME actual: "${process.env.DB_NAME}"). Ejecuta "npm test".`);
}

const request = require("supertest");
const app = require("../src/app");
const { sequelize, Usuario } = require("../src/models");

let n = 0;
const unico = () => `${Date.now()}${n++}`;

// Por defecto deja el correo ya verificado para que las pruebas no tengan que repetir ese paso.
async function registrar(rol = "turista", { verificado = true } = {}) {
  const correo = `u${unico()}@test.com`;
  const res = await request(app).post("/api/v1/auth/registro").send({ nombre: "Usuario Prueba", correo, password: "clave12345", rol, acepta_terminos: true });
  if (verificado && res.body.usuario) {
    await Usuario.update({ correo_verificado: true }, { where: { id: res.body.usuario.id } });
    res.body.usuario.correo_verificado = true;
  }
  return { correo, token: res.body.token, usuario: res.body.usuario, res };
}

const auth = (token) => ({ Authorization: `Bearer ${token}` });

const api = (m, url) => request(app)[m](`/api/v1${url}`);
const enDias = (n) => new Date(Date.now() + n * 864e5).toLocaleDateString("en-CA");

module.exports = { request, app, sequelize, registrar, auth, api, enDias };
