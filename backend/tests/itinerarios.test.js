const test = require("node:test");
const assert = require("node:assert/strict");
const { request, app, sequelize, registrar, auth } = require("./helpers");
const { Prestador } = require("../src/models");
const { fechaDelDia } = require("../src/utils/fechas");

test.after(() => sequelize.close());

const api = (m, url) => request(app)[m](`/api/v1${url}`);
const enDias = (n) => new Date(Date.now() + n * 864e5).toISOString().slice(0, 10);

// Un prestador aprobado en un municipio propio de la prueba, para que el itinerario solo vea sus servicios.
async function escenario(municipio) {
  const prest = await registrar("prestador");
  const p = await Prestador.create({ usuario_id: prest.usuario.id, nombre_negocio: `Negocio ${municipio}`, categoria: "Naturaleza", municipio, estado_verificacion: "aprobado" });
  const crear = async (nombre, precio, extra = {}) => (await api("post", "/sitios").set(auth(prest.token)).send({
    nombre, categoria: "Naturaleza", municipio, precio, tipo_viaje: "naturaleza", prestador_id: p.id, ...extra,
  })).body;
  return { prest, crear };
}

test("fechaDelDia suma días sin saltos por zona horaria ni por cambio de mes", () => {
  assert.equal(fechaDelDia("2030-01-30", 1), "2030-01-30");
  assert.equal(fechaDelDia("2030-01-30", 3), "2030-02-01");
  assert.equal(fechaDelDia("2030-12-31", 2), "2031-01-01");
});

test("el itinerario guarda la fecha de inicio y el número de personas, y lo devuelve en el historial", async () => {
  const { crear } = await escenario("Municipio Fechas");
  await crear("Mirador uno", 10000);
  const turista = await registrar("turista");
  const inicio = enDias(10);

  const res = await api("post", "/itinerarios").set(auth(turista.token))
    .send({ presupuesto: 500000, dias: 2, personas: 3, fecha_inicio: inicio, municipio: "Municipio Fechas" });
  assert.equal(res.status, 201);
  assert.equal(res.body.fecha_inicio, inicio);
  assert.equal(res.body.personas, 3);

  const lista = await api("get", "/itinerarios").set(auth(turista.token));
  assert.equal(lista.body[0].fecha_inicio, inicio);
  assert.equal(lista.body[0].personas, 3);
});

test("la fecha de inicio debe ser futura y tener formato válido", async () => {
  await escenario("Municipio Pasado");
  const turista = await registrar("turista");
  const base = { presupuesto: 100000, dias: 1, municipio: "Municipio Pasado" };
  assert.equal((await api("post", "/itinerarios").set(auth(turista.token)).send({ ...base, fecha_inicio: "2020-01-01" })).status, 400);
  assert.equal((await api("post", "/itinerarios").set(auth(turista.token)).send({ ...base, fecha_inicio: "mañana" })).status, 400);
  assert.equal((await api("post", "/itinerarios").set(auth(turista.token)).send({ ...base, personas: 0 })).status, 400);
});

test("el presupuesto es del grupo: el costo de cada servicio se multiplica por las personas", async () => {
  const { crear } = await escenario("Municipio Grupo");
  await crear("Caro por persona", 60000);
  const turista = await registrar("turista");
  const body = { presupuesto: 100000, dias: 1, municipio: "Municipio Grupo" };

  const sola = await api("post", "/itinerarios").set(auth(turista.token)).send({ ...body, personas: 1 });
  assert.equal(sola.status, 201); // 60.000 cabe en 100.000

  const grupo = await api("post", "/itinerarios").set(auth(turista.token)).send({ ...body, personas: 2 });
  assert.equal(grupo.status, 400); // 2 x 60.000 = 120.000 no cabe
});

test("un servicio con cupo menor al tamaño del grupo no se recomienda", async () => {
  const { crear } = await escenario("Municipio Cupo");
  await crear("Cupo pequeño", 5000, { capacidad: 2 });
  const grande = await crear("Sin límite", 5000);
  const turista = await registrar("turista");

  const res = await api("post", "/itinerarios").set(auth(turista.token)).send({ presupuesto: 500000, dias: 1, personas: 4, municipio: "Municipio Cupo" });
  assert.equal(res.status, 201);
  const ids = res.body.items.map((i) => i.sitio_id);
  assert.deepEqual(ids, [grande.id]);
});

test("un servicio no se programa en un día que el prestador tiene bloqueado", async () => {
  const { prest, crear } = await escenario("Municipio Bloqueo");
  const a = await crear("Cascada A", 10000);
  const b = await crear("Cascada B", 10000);
  const inicio = enDias(15);
  // A no atiende el día 1 ni el día 2 del plan: solo puede quedar el servicio B
  for (const d of [1, 2]) {
    await api("post", `/sitios/${a.id}/fechas-bloqueadas`).set(auth(prest.token)).send({ fecha: fechaDelDia(inicio, d) });
  }
  const turista = await registrar("turista");
  const res = await api("post", "/itinerarios").set(auth(turista.token))
    .send({ presupuesto: 500000, dias: 2, fecha_inicio: inicio, municipio: "Municipio Bloqueo" });
  assert.equal(res.status, 201);
  assert.ok(res.body.items.length > 0);
  assert.ok(res.body.items.every((i) => i.sitio_id === b.id));

  // sin fecha de inicio no hay forma de saber qué días aplican: ambos servicios pueden aparecer
  const sinFecha = await api("post", "/itinerarios").set(auth(turista.token)).send({ presupuesto: 500000, dias: 2, municipio: "Municipio Bloqueo" });
  assert.equal(sinFecha.body.fecha_inicio, null);
  assert.ok(sinFecha.body.items.some((i) => i.sitio_id === a.id));
});
