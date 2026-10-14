const test = require("node:test");
const assert = require("node:assert/strict");
const { request, app, sequelize, registrar, auth } = require("./helpers");
const { Prestador, Usuario, SitioTuristico } = require("../src/models");

test.after(() => sequelize.close());

const api = (m, url) => request(app)[m](`/api/v1${url}`);
const enDias = (n) => new Date(Date.now() + n * 864e5).toISOString().slice(0, 10);

// Un prestador aprobado en un municipio propio de la prueba y un turista con un itinerario generado con sus servicios.
async function escenario(municipio) {
  const prest = await registrar("prestador");
  const p = await Prestador.create({ usuario_id: prest.usuario.id, nombre_negocio: `Negocio ${municipio}`, categoria: "Naturaleza", municipio, estado_verificacion: "aprobado" });
  const crear = async (nombre, precio) => (await api("post", "/sitios").set(auth(prest.token)).send({
    nombre, categoria: "Naturaleza", municipio, precio, tipo_viaje: "naturaleza", prestador_id: p.id,
  })).body;
  const sitioA = await crear("Mirador del Compartido", 12000);
  const sitioB = await crear("Cascada del Compartido", 15000);
  const turista = await registrar("turista");
  const it = (await api("post", "/itinerarios").set(auth(turista.token))
    .send({ presupuesto: 700000, dias: 2, personas: 2, fecha_inicio: enDias(12), municipio })).body;
  return { prest, p, turista, it, sitioA, sitioB };
}

test("un itinerario nuevo no está compartido y el dueño puede crear su enlace (siempre el mismo)", async () => {
  const { turista, it } = await escenario("Municipio Compartir Uno");
  assert.equal(it.token_publico ?? null, null);

  const primero = await api("post", `/itinerarios/${it.id}/compartir`).set(auth(turista.token));
  assert.equal(primero.status, 200);
  assert.match(primero.body.token, /^[A-Za-z0-9_-]{16,64}$/);
  const segundo = await api("post", `/itinerarios/${it.id}/compartir`).set(auth(turista.token));
  assert.equal(segundo.body.token, primero.body.token); // compartir otra vez no cambia la dirección

  const propio = await api("get", `/itinerarios/${it.id}`).set(auth(turista.token));
  assert.equal(propio.body.token_publico, primero.body.token);
});

test("cualquiera con el enlace ve el plan sin iniciar sesión, y no se le muestran datos personales", async () => {
  const { turista, it } = await escenario("Municipio Compartir Dos");
  const { token } = (await api("post", `/itinerarios/${it.id}/compartir`).set(auth(turista.token))).body;

  const res = await api("get", `/itinerarios/compartido/${token}`); // sin sesión
  assert.equal(res.status, 200);
  assert.equal(res.body.dias, 2);
  assert.equal(res.body.personas, 2);
  assert.ok(res.body.items.length >= 1);
  assert.ok(res.body.items.every((i) => i.sitio.nombre && i.sitio.municipio && i.justificacion));
  // privacidad: nada de quién es, cuánto presupuestó ni identificadores internos del dueño
  const texto = JSON.stringify(res.body);
  for (const prohibido of ['"turista_id"', '"presupuesto"', "700000", "700.000", '"token_publico"', turista.correo, '"prestador_id"', "motivo_moderacion"]) assert.ok(!texto.includes(prohibido), `no debe incluir ${prohibido}`);
  // no se indexa ni se guarda en cachés
  assert.equal(res.headers["cache-control"], "no-store");
  assert.match(res.headers["x-robots-tag"], /noindex/);
});

test("solo el dueño puede compartir o dejar de compartir, y hace falta sesión", async () => {
  const { turista, it } = await escenario("Municipio Compartir Tres");
  const otro = await registrar("turista");
  assert.equal((await api("post", `/itinerarios/${it.id}/compartir`)).status, 401);
  assert.equal((await api("post", `/itinerarios/${it.id}/compartir`).set(auth(otro.token))).status, 403);
  assert.equal((await api("delete", `/itinerarios/${it.id}/compartir`).set(auth(otro.token))).status, 403);
  assert.equal((await api("post", "/itinerarios/2000000000/compartir").set(auth(turista.token))).status, 404);
  assert.equal((await api("post", "/itinerarios/abc/compartir").set(auth(turista.token))).status, 404);
});

test("dejar de compartir revoca el enlace al instante, y volver a compartir da una dirección nueva", async () => {
  const { turista, it } = await escenario("Municipio Compartir Cuatro");
  const { token } = (await api("post", `/itinerarios/${it.id}/compartir`).set(auth(turista.token))).body;
  assert.equal((await api("get", `/itinerarios/compartido/${token}`)).status, 200);

  assert.equal((await api("delete", `/itinerarios/${it.id}/compartir`).set(auth(turista.token))).status, 204);
  assert.equal((await api("get", `/itinerarios/compartido/${token}`)).status, 404);
  assert.equal((await api("delete", `/itinerarios/${it.id}/compartir`).set(auth(turista.token))).status, 204); // repetirlo no falla

  const nuevo = (await api("post", `/itinerarios/${it.id}/compartir`).set(auth(turista.token))).body.token;
  assert.notEqual(nuevo, token);
  assert.equal((await api("get", `/itinerarios/compartido/${token}`)).status, 404); // la vieja sigue muerta
  assert.equal((await api("get", `/itinerarios/compartido/${nuevo}`)).status, 200);
});

test("un enlace inventado, mal formado o vacío da 404 y no revela nada", async () => {
  for (const token of ["a", "x".repeat(30), "../../etc/passwd", "%00", "A".repeat(200), "con espacios en medio ok"]) {
    const res = await api("get", `/itinerarios/compartido/${encodeURIComponent(token)}`);
    assert.equal(res.status, 404, token);
    assert.equal(res.body.error, "Este itinerario no existe o ya no se comparte.");
  }
});

test("el plan compartido solo muestra servicios que hoy son públicos", async () => {
  const { turista, it, p, sitioA, sitioB } = await escenario("Municipio Compartir Cinco");
  const { token } = (await api("post", `/itinerarios/${it.id}/compartir`).set(auth(turista.token))).body;
  const nombres = async () => (await api("get", `/itinerarios/compartido/${token}`)).body.items.map((i) => i.sitio.nombre);
  const antes = await nombres();
  assert.ok(antes.includes(sitioA.nombre) || antes.includes(sitioB.nombre));

  await SitioTuristico.update({ estado: "oculto" }, { where: { id: sitioA.id } }); // moderación
  assert.ok(!(await nombres()).includes(sitioA.nombre));

  await Prestador.update({ estado_verificacion: "suspendido" }, { where: { id: p.id } }).catch(() => {});
  await Usuario.update({ activo: false }, { where: { id: p.usuario_id } }); // cuenta suspendida
  assert.deepEqual(await nombres(), []); // ya no queda nada público; el enlace sigue vivo pero vacío
});
