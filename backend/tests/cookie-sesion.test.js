const test = require("node:test");
const assert = require("node:assert/strict");
const { sequelize, registrar, api } = require("./helpers");

test.after(() => sequelize.close());

const WEB = { "X-Requested-With": "PubliTours" }; // lo que manda la aplicación web
const PASSWORD = "clave12345";

// "publitours_sesion=<jwt>; Path=/; HttpOnly; ..." -> solo "publitours_sesion=<jwt>" para reenviarla
const galleta = (res) => (res.headers["set-cookie"] || []).find((c) => c.startsWith("publitours_sesion=")) || "";
const par = (res) => galleta(res).split(";")[0];

async function iniciarComoWeb(correo, password = PASSWORD) {
  return api("post", "/auth/login").set(WEB).send({ correo, password });
}

test("el inicio de sesión de la aplicación web entrega una cookie HttpOnly y no muestra el token", async () => {
  const t = await registrar("turista");
  const res = await iniciarComoWeb(t.correo);
  assert.equal(res.status, 200);
  assert.equal(res.body.token, undefined);
  assert.ok(res.body.usuario);
  const c = galleta(res);
  assert.match(c, /HttpOnly/i);
  assert.match(c, /SameSite=Lax/i);
  assert.match(c, /Path=\//);
  assert.match(c, /Max-Age=\d+|Expires=/i);
  assert.doesNotMatch(c, /Secure/i); // la petición de prueba es HTTP
});

test("un cliente de API (sin la cabecera de la aplicación) sigue recibiendo el token", async () => {
  const t = await registrar("turista");
  const res = await api("post", "/auth/login").send({ correo: t.correo, password: PASSWORD });
  assert.ok(res.body.token);
  assert.match(galleta(res), /HttpOnly/i);
});

test("la cookie autentica las consultas y la cuenta sigue siendo la misma", async () => {
  const t = await registrar("turista");
  const login = await iniciarComoWeb(t.correo);
  const yo = await api("get", "/usuarios/me").set("Cookie", par(login));
  assert.equal(yo.status, 200);
  assert.equal(yo.body.correo, t.correo);
});

test("CSRF: con cookie, una petición que cambia datos sin la cabecera de la aplicación se rechaza", async () => {
  const t = await registrar("turista");
  const cookie = par(await iniciarComoWeb(t.correo));
  const sinCabecera = await api("put", "/auth/perfil").set("Cookie", cookie).send({ nombre: "Otro Nombre", correo: t.correo });
  assert.equal(sinCabecera.status, 403);
  assert.match(sinCabecera.body.error, /cabecera/);
  const conCabecera = await api("put", "/auth/perfil").set("Cookie", cookie).set(WEB).send({ nombre: "Otro Nombre", correo: t.correo });
  assert.equal(conCabecera.status, 200);
  // las lecturas no la necesitan
  assert.equal((await api("get", "/usuarios/me").set("Cookie", cookie)).status, 200);
});

test("con Bearer no hace falta la cabecera (no hay cookie que un sitio ajeno pueda aprovechar)", async () => {
  const t = await registrar("turista");
  const res = await api("put", "/auth/perfil").set("Authorization", `Bearer ${t.token}`).send({ nombre: "Nombre Bearer", correo: t.correo });
  assert.equal(res.status, 200);
});

test("sin cookie ni token la respuesta es 401, y una cookie manipulada también", async () => {
  assert.equal((await api("get", "/usuarios/me")).status, 401);
  assert.equal((await api("get", "/usuarios/me").set("Cookie", "publitours_sesion=basura")).status, 401);
  assert.equal((await api("get", "/usuarios/me").set("Cookie", "otra=1; publitours_sesion=%E0%A4%A")).status, 401); // codificación inválida
});

test("cerrar sesión borra la cookie", async () => {
  const t = await registrar("turista");
  const cookie = par(await iniciarComoWeb(t.correo));
  const res = await api("post", "/auth/logout").set("Cookie", cookie).set(WEB);
  assert.equal(res.status, 200);
  const borrada = galleta(res);
  assert.match(borrada, /publitours_sesion=;/);
  assert.match(borrada, /Expires=Thu, 01 Jan 1970/);
});

test("cambiar la contraseña desde el navegador renueva la cookie y no entrega el token", async () => {
  const t = await registrar("turista");
  const cookie = par(await iniciarComoWeb(t.correo));
  const cambio = await api("put", "/auth/password").set("Cookie", cookie).set(WEB).send({ actual: PASSWORD, nueva: "otraClave98765" });
  assert.equal(cambio.status, 200);
  assert.equal(cambio.body.token, undefined);
  const nueva = par(cambio);
  assert.ok(nueva && nueva !== cookie);
  assert.equal((await api("get", "/usuarios/me").set("Cookie", cookie)).status, 401); // la cookie anterior ya no vale
  assert.equal((await api("get", "/usuarios/me").set("Cookie", nueva)).status, 200);
});

test("el registro desde la aplicación web también deja la sesión en la cookie", async () => {
  const correo = `cookie${Date.now()}@test.com`;
  const res = await api("post", "/auth/registro").set(WEB).send({ nombre: "Cookie Uno", correo, password: PASSWORD, rol: "turista", acepta_terminos: true });
  assert.equal(res.status, 201);
  assert.equal(res.body.token, undefined);
  assert.equal((await api("get", "/usuarios/me").set("Cookie", par(res))).status, 200);
});

test("CORS permite enviar la cookie solo al origen configurado", async () => {
  const res = await api("get", "/configuracion").set("Origin", "http://localhost:5173");
  assert.equal(res.headers["access-control-allow-credentials"], "true");
  assert.equal(res.headers["access-control-allow-origin"], "http://localhost:5173");
});
