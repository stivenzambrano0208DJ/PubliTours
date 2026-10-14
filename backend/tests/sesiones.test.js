const test = require("node:test");
const assert = require("node:assert/strict");
const crypto = require("node:crypto");
const jwt = require("jsonwebtoken");
const nodemailer = require("nodemailer");
const { request, app, sequelize, registrar, auth } = require("./helpers");
const { Usuario, PasswordReset } = require("../src/models");

test.after(() => sequelize.close());

const api = (m, url) => request(app)[m](`/api/v1${url}`);
const PASSWORD = "clave12345";
const sha = (texto) => crypto.createHash("sha256").update(texto).digest("hex");
const yo = (token) => api("get", "/usuarios/me").set(auth(token));
const iniciarSesion = async (correo, password = PASSWORD) => (await api("post", "/auth/login").send({ correo, password })).body.token;

test("cambiar la contraseña cierra las demás sesiones y la actual recibe un token nuevo", async () => {
  const t = await registrar("turista");
  const otraSesion = await iniciarSesion(t.correo);
  assert.equal((await yo(t.token)).status, 200);
  assert.equal((await yo(otraSesion)).status, 200);

  const cambio = await api("put", "/auth/password").set(auth(t.token)).send({ actual: PASSWORD, nueva: "otraClave98765" });
  assert.equal(cambio.status, 200);
  assert.ok(cambio.body.token);

  for (const viejo of [t.token, otraSesion]) {
    const res = await yo(viejo);
    assert.equal(res.status, 401);
    assert.match(res.body.error, /sesión ya no es válida/);
  }
  assert.equal((await yo(cambio.body.token)).status, 200); // la sesión que hizo el cambio sigue conectada
  assert.ok(await iniciarSesion(t.correo, "otraClave98765")); // y la contraseña nueva funciona
});

test("una contraseña actual incorrecta no cierra ninguna sesión", async () => {
  const t = await registrar("turista");
  const res = await api("put", "/auth/password").set(auth(t.token)).send({ actual: "equivocada1", nueva: "otraClave98765" });
  assert.equal(res.status, 400);
  assert.equal((await yo(t.token)).status, 200);
});

test("restablecer la contraseña con el código cierra todas las sesiones abiertas", async () => {
  const t = await registrar("turista");
  await PasswordReset.create({ usuario_id: t.usuario.id, token_hash: sha("123456"), expira: new Date(Date.now() + 600000) });
  const res = await api("post", "/auth/restablecer-password").send({ correo: t.correo, codigo: "123456", password: "restablecida123" });
  assert.equal(res.status, 200);
  assert.equal((await yo(t.token)).status, 401);
  assert.ok(await iniciarSesion(t.correo, "restablecida123"));
});

test("los tokens emitidos antes de existir la versión de sesión siguen valiendo (nadie queda desconectado)", async () => {
  const t = await registrar("turista");
  const antiguo = jwt.sign({ id: t.usuario.id, correo: t.correo, rol: "turista" }, process.env.JWT_SECRET, { expiresIn: "1h" }); // sin "v"
  assert.equal((await yo(antiguo)).status, 200);
  await Usuario.update({ token_version: 1 }, { where: { id: t.usuario.id } });
  assert.equal((await yo(antiguo)).status, 401); // pero dejan de valer cuando la cuenta sube de versión
});

test("un token con una versión que no corresponde se rechaza", async () => {
  const t = await registrar("turista");
  const futuro = jwt.sign({ id: t.usuario.id, correo: t.correo, rol: "turista", v: 99 }, process.env.JWT_SECRET, { expiresIn: "1h" });
  assert.equal((await yo(futuro)).status, 401);
});

test("recuperar contraseña responde igual exista o no la cuenta, y solo crea código si existe", async () => {
  const t = await registrar("turista");
  const existente = await api("post", "/auth/olvide-password").send({ correo: t.correo });
  const inexistente = await api("post", "/auth/olvide-password").send({ correo: `nadie${Date.now()}@test.com` });
  assert.equal(existente.status, 200);
  assert.deepEqual(existente.body, inexistente.body); // ni el cuerpo delata si la cuenta existe
  assert.equal(await PasswordReset.count({ where: { usuario_id: t.usuario.id } }), 1);
});

test("en producción la respuesta de recuperación no revela cómo está configurado el servidor", async () => {
  const antes = process.env.NODE_ENV;
  process.env.NODE_ENV = "production";
  try {
    const t = await registrar("turista");
    const res = await api("post", "/auth/olvide-password").send({ correo: t.correo });
    assert.deepEqual(Object.keys(res.body), ["mensaje"]);
  } finally { process.env.NODE_ENV = antes; }
});

test("una cuenta eliminada no recibe códigos de recuperación", async () => {
  const t = await registrar("turista");
  await Usuario.update({ eliminado_en: new Date() }, { where: { id: t.usuario.id } });
  await api("post", "/auth/olvide-password").send({ correo: t.correo });
  assert.equal(await PasswordReset.count({ where: { usuario_id: t.usuario.id } }), 0);
});

test("iniciar sesión con una cuenta inexistente y con una clave incorrecta da la misma respuesta", async () => {
  const t = await registrar("turista");
  const inexistente = await api("post", "/auth/login").send({ correo: `nadie${Date.now()}@test.com`, password: PASSWORD });
  const incorrecta = await api("post", "/auth/login").send({ correo: t.correo, password: "equivocada1" });
  assert.equal(inexistente.status, 401);
  assert.equal(incorrecta.status, 401);
  assert.deepEqual(inexistente.body, incorrecta.body);
  assert.equal(inexistente.body.error, "Credenciales inválidas.");
});

test("dos registros simultáneos con el mismo correo: uno se crea y el otro recibe un 400, no un error interno", async () => {
  const correo = `carrera${Date.now()}@test.com`;
  const intento = () => api("post", "/auth/registro").send({ nombre: "Carrera Uno", correo, password: PASSWORD, rol: "turista", acepta_terminos: true });
  const resultados = await Promise.all([intento(), intento(), intento()]);
  const estados = resultados.map((r) => r.status).sort();
  assert.deepEqual(estados, [201, 400, 400]);
  assert.ok(resultados.filter((r) => r.status === 400).every((r) => r.body.error === "El correo ya está registrado."));
});

test("el correo de recuperación escapa el nombre y entrega el código", async () => {
  const { enviarCorreoRecuperacion, enviarCorreo, correoConfigurado } = require("../src/services/emailService");
  const enviados = [];
  const original = nodemailer.createTransport;
  nodemailer.createTransport = () => ({ sendMail: async (m) => { enviados.push(m); } });
  const prev = { u: process.env.EMAIL_USER, p: process.env.EMAIL_PASS };
  process.env.EMAIL_USER = "prueba@test.com";
  process.env.EMAIL_PASS = "clave";
  try {
    assert.equal(correoConfigurado(), true);
    await enviarCorreoRecuperacion({ destinatario: "x@test.com", nombre: '<img src=x onerror="alert(1)">', codigo: "654321" });
    await enviarCorreo({ destinatario: "x@test.com", asunto: "Hola", titulo: "<b>Título</b>", lineas: ["<script>robar()</script>"] });
  } finally {
    nodemailer.createTransport = original;
    process.env.EMAIL_USER = prev.u ?? "";
    process.env.EMAIL_PASS = prev.p ?? "";
  }
  assert.equal(enviados.length, 2);
  assert.ok(enviados[0].html.includes("654321"));
  assert.ok(!enviados[0].html.includes("<img"));
  assert.ok(enviados[0].html.includes("&lt;img"));
  assert.ok(!enviados[1].html.includes("<script>") && !enviados[1].html.includes("<b>Título"));
});

test("sin correo configurado el servicio lo informa y no envía nada", async () => {
  const { correoConfigurado } = require("../src/services/emailService");
  assert.equal(correoConfigurado(), false); // npm test arranca con EMAIL_USER y EMAIL_PASS vacíos
});
