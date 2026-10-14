const test = require("node:test");
const assert = require("node:assert/strict");
const { request, app, sequelize, registrar, auth } = require("./helpers");
const { Prestador, Reserva, Resena } = require("../src/models");

test.after(() => sequelize.close());

const api = (m, url) => request(app)[m](`/api/v1${url}`);
const enDias = (n) => new Date(Date.now() + n * 864e5).toLocaleDateString("en-CA");

// Tres servicios en un municipio exclusivo de la prueba, con calificaciones 5, 3 y sin reseñas.
async function escenario() {
  const municipio = `Municipio Filtros ${Date.now()}`;
  const prest = await registrar("prestador");
  const p = await Prestador.create({ usuario_id: prest.usuario.id, nombre_negocio: "Filtros", categoria: "Naturaleza", municipio, estado_verificacion: "aprobado" });
  const crear = async (nombre, extra = {}) => (await api("post", "/sitios").set(auth(prest.token)).send({
    nombre, categoria: "Naturaleza", municipio, precio: 10000, prestador_id: p.id, ...extra,
  })).body;
  const excelente = await crear("Excelente");
  const regular = await crear("Regular");
  const nuevo = await crear("Nuevo", { capacidad: 2 });

  const turista = await registrar("turista");
  const resenar = async (sitio, calificacion) => {
    const r = await Reserva.create({ turista_id: turista.usuario.id, sitio_id: sitio.id, prestador_id: p.id, fecha_servicio: "2020-01-01", estado: "completada" });
    await Resena.create({ sitio_id: sitio.id, turista_id: turista.usuario.id, reserva_id: r.id, calificacion });
  };
  await resenar(excelente, 5);
  await resenar(regular, 3);
  return { municipio, prest, excelente, regular, nuevo };
}
const nombres = (res) => res.body.resultados.map((s) => s.nombre);

test("filtrar por calificación mínima y ordenar por mejor calificados", async () => {
  const { municipio } = await escenario();
  const q = `/sitios?municipio=${encodeURIComponent(municipio)}`;

  assert.deepEqual(nombres(await api("get", `${q}&calificacion_min=4`)), ["Excelente"]);
  assert.deepEqual(nombres(await api("get", `${q}&calificacion_min=3`)).sort(), ["Excelente", "Regular"]);
  assert.equal((await api("get", `${q}&calificacion_min=3`)).body.total, 2); // el total respeta el filtro
  assert.equal((await api("get", `${q}&calificacion_min=abc`)).body.total, 3); // valor inválido: se ignora
  assert.equal((await api("get", `${q}&calificacion_min=9`)).body.total, 3); // fuera de rango: se ignora

  assert.deepEqual(nombres(await api("get", `${q}&orden=calificacion`)), ["Excelente", "Regular", "Nuevo"]);
});

test("filtrar por fecha disponible: excluye días bloqueados y con el cupo lleno", async () => {
  const { municipio, prest, excelente, regular, nuevo } = await escenario();
  const q = `/sitios?municipio=${encodeURIComponent(municipio)}`;
  const fecha = enDias(20);

  assert.equal((await api("get", `${q}&fecha=${fecha}`)).body.total, 3); // todo libre

  // Excelente bloquea ese día
  await api("post", `/sitios/${excelente.id}/fechas-bloqueadas`).set(auth(prest.token)).send({ fecha });
  // Regular (sin cupos definidos) ya tiene una reserva confirmada ese día
  const t1 = await registrar("turista");
  const r1 = await api("post", "/reservas").set(auth(t1.token)).send({ sitio_id: regular.id, fecha_servicio: fecha });
  await api("patch", `/reservas/${r1.body.id}/confirmar`).set(auth(prest.token));
  assert.deepEqual(nombres(await api("get", `${q}&fecha=${fecha}`)), ["Nuevo"]);

  // Nuevo tiene 2 cupos: con 2 personas confirmadas se llena
  const t2 = await registrar("turista");
  const r2 = await api("post", "/reservas").set(auth(t2.token)).send({ sitio_id: nuevo.id, fecha_servicio: fecha, personas: 2 });
  await api("patch", `/reservas/${r2.body.id}/confirmar`).set(auth(prest.token));
  assert.equal((await api("get", `${q}&fecha=${fecha}`)).body.total, 0);

  // otro día sigue todo libre; una fecha pasada o inválida no filtra
  assert.equal((await api("get", `${q}&fecha=${enDias(21)}`)).body.total, 3);
  assert.equal((await api("get", `${q}&fecha=2020-01-01`)).body.total, 3);
  assert.equal((await api("get", `${q}&fecha=mañana`)).body.total, 3);
});

test("los filtros se combinan entre sí y con la búsqueda por texto", async () => {
  const { municipio, prest, excelente } = await escenario();
  const fecha = enDias(30);
  await api("post", `/sitios/${excelente.id}/fechas-bloqueadas`).set(auth(prest.token)).send({ fecha });
  const base = `/sitios?municipio=${encodeURIComponent(municipio)}&fecha=${fecha}`;
  assert.deepEqual(nombres(await api("get", `${base}&calificacion_min=4`)), []); // el único 4+ está bloqueado ese día
  assert.deepEqual(nombres(await api("get", `${base}&calificacion_min=3`)), ["Regular"]);
  assert.deepEqual(nombres(await api("get", `${base}&texto=nuev`)), ["Nuevo"]);
});
