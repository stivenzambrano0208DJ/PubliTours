const test = require("node:test");
const assert = require("node:assert/strict");
const { request, app, sequelize, registrar, auth } = require("./helpers");
const { Notificacion } = require("../src/models");

test.after(() => sequelize.close());

const api = (m, url) => request(app)[m](`/api/v1${url}`);

test("marcar una notificación como leída funciona para su dueño", async () => {
  const t = await registrar("turista");
  const n = await Notificacion.create({ usuario_id: t.usuario.id, tipo: "prueba", mensaje: "Hola" });
  const res = await api("patch", `/notificaciones/${n.id}/leido`).set(auth(t.token));
  assert.equal(res.status, 200);
  assert.equal(res.body.leido, true);
});

test("no se puede marcar la notificación de otra persona ni una inexistente", async () => {
  const dueno = await registrar("turista");
  const otro = await registrar("turista");
  const n = await Notificacion.create({ usuario_id: dueno.usuario.id, tipo: "prueba", mensaje: "Privada" });
  assert.equal((await api("patch", `/notificaciones/${n.id}/leido`).set(auth(otro.token))).status, 403);
  assert.equal((await Notificacion.findByPk(n.id)).leido, false);
  assert.equal((await api("patch", "/notificaciones/2000000000/leido").set(auth(otro.token))).status, 404);
  assert.equal((await api("patch", `/notificaciones/${n.id}/leido`)).status, 401);
});

test("la lista de notificaciones devuelve solo las 100 más recientes de quien la pide", async () => {
  const t = await registrar("turista");
  const otro = await registrar("turista");
  const base = Date.now();
  await Notificacion.bulkCreate(Array.from({ length: 105 }, (_, i) => ({
    usuario_id: t.usuario.id, tipo: "prueba", mensaje: `n${i}`, fecha: new Date(base + i * 1000),
  })));
  await Notificacion.create({ usuario_id: otro.usuario.id, tipo: "prueba", mensaje: "ajena" });

  const res = await api("get", "/notificaciones").set(auth(t.token));
  assert.equal(res.status, 200);
  assert.equal(res.body.length, 100);
  assert.equal(res.body[0].mensaje, "n104"); // la más reciente primero
  assert.ok(res.body.every((x) => x.mensaje !== "ajena"));
});
