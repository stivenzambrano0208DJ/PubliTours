const test = require("node:test");
const assert = require("node:assert/strict");
const { request, app, sequelize, registrar, auth } = require("./helpers");
const { Prestador } = require("../src/models");

test.after(() => sequelize.close());

const api = (m, url) => request(app)[m](`/api/v1${url}`);
const enDias = (n) => new Date(Date.now() + n * 864e5).toLocaleDateString("en-CA");

async function servicio(extra = {}) {
  const prest = await registrar("prestador");
  const p = await Prestador.create({ usuario_id: prest.usuario.id, nombre_negocio: "Concurrencia", categoria: "Naturaleza", municipio: "Florencia", estado_verificacion: "aprobado" });
  const sitio = (await api("post", "/sitios").set(auth(prest.token)).send({
    nombre: "Cupo único", categoria: "Naturaleza", municipio: "Florencia", precio: 10000, prestador_id: p.id, ...extra,
  })).body;
  return { prest, sitio };
}
const solicitar = async (sitio, fecha, personas = 1) => {
  const t = await registrar("turista");
  return (await api("post", "/reservas").set(auth(t.token)).send({ sitio_id: sitio.id, fecha_servicio: fecha, personas })).body;
};
const confirmar = (prest, reserva) => api("patch", `/reservas/${reserva.id}/confirmar`).set(auth(prest.token));

test("sin capacidad definida, confirmaciones simultáneas del mismo día: solo una prospera", async () => {
  const { prest, sitio } = await servicio();
  const fecha = enDias(15);
  const reservas = await Promise.all([1, 2, 3, 4].map(() => solicitar(sitio, fecha)));

  const respuestas = await Promise.all(reservas.map((r) => confirmar(prest, r)));
  assert.equal(respuestas.filter((r) => r.status === 200).length, 1);
  assert.equal(respuestas.filter((r) => r.status !== 200).length, 3);
});

test("con capacidad, las confirmaciones simultáneas nunca superan los cupos", async () => {
  const { prest, sitio } = await servicio({ capacidad: 5 });
  const fecha = enDias(16);
  const reservas = await Promise.all([3, 3, 2, 2].map((n) => solicitar(sitio, fecha, n)));

  const respuestas = await Promise.all(reservas.map((r) => confirmar(prest, r)));
  const aceptadas = reservas.filter((_, i) => respuestas[i].status === 200);
  const ocupados = aceptadas.reduce((s, r) => s + r.personas, 0);
  assert.ok(ocupados <= 5, `se confirmaron ${ocupados} personas con 5 cupos`);
  assert.ok(aceptadas.length >= 2); // siempre cabe al menos un 3 + un 2
});

test("confirmar dos veces la misma reserva a la vez solo la confirma una vez", async () => {
  const { prest, sitio } = await servicio();
  const reserva = await solicitar(sitio, enDias(17));
  const respuestas = await Promise.all([confirmar(prest, reserva), confirmar(prest, reserva)]);
  assert.deepEqual(respuestas.map((r) => r.status).sort(), [200, 400]);
});
