const test = require("node:test");
const assert = require("node:assert/strict");
const { request, app, sequelize, registrar, auth } = require("./helpers");
const { Prestador } = require("../src/models");
const { interpretacionBasica, extraerPresupuesto, extraerDias, interpretarSolicitud } = require("../src/services/iaService");

test.after(() => sequelize.close());

const MUNICIPIOS = ["Florencia", "Belen de los Andaquies", "Morelia"];
const normalizar = (t) => t.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");

test("presupuesto: interpreta formatos habituales en pesos colombianos", () => {
  const casos = [
    ["tengo $500.000", 500000],
    ["con 500 mil pesos", 500000],
    ["presupuesto de 1.200.000", 1200000],
    ["2 millones", 2000000],
    ["medio millón", 500000],
    ["unos 800k", 800000],
    ["quiero viajar 3 días", null],
  ];
  for (const [texto, esperado] of casos) assert.equal(extraerPresupuesto(normalizar(texto)), esperado, texto);
});

test("días: números, palabras, noches, fin de semana y semanas", () => {
  const casos = [
    ["3 días", 3], ["tres dias", 3], ["2 noches", 3], ["un fin de semana", 2], ["una semana", 7], ["quiero ir con $300.000", null],
  ];
  for (const [texto, esperado] of casos) assert.equal(extraerDias(normalizar(texto)), esperado, texto);
});

test("interpretación básica: viaje romántico de 3 días en Florencia con $500.000", () => {
  const r = interpretacionBasica("Quiero un viaje romántico de 3 días en Florencia con $500.000", { municipios: MUNICIPIOS });
  assert.equal(r.dias, 3);
  assert.equal(r.presupuesto, 500000);
  assert.equal(r.municipio, "Florencia");
  assert.deepEqual(r.preferencias, ["pareja"]);
});

test("interpretación básica: reconoce municipios sin tildes y varios intereses", () => {
  const r = interpretacionBasica("Con mis hijos queremos cascadas y rafting en Belén de los Andaquíes, 2 días, 400 mil", { municipios: MUNICIPIOS });
  assert.equal(r.municipio, "Belen de los Andaquies");
  assert.deepEqual(r.preferencias.sort(), ["aventura", "familia", "naturaleza"]);
  assert.equal(r.dias, 2);
  assert.equal(r.presupuesto, 400000);
});

test("interpretación básica: no inventa lo que el usuario no dijo", () => {
  const r = interpretacionBasica("algo bonito", { municipios: MUNICIPIOS });
  assert.deepEqual(r, { presupuesto: null, dias: null, preferencias: [], municipio: null, categoria: null });
});

const clienteFalso = (input) => ({ messages: { create: async () => ({ content: [{ type: "tool_use", name: "registrar_parametros_de_viaje", input }] }) } });

test("con IA: usa los parámetros del modelo y descarta valores que no existen en el catálogo", async () => {
  const r = await interpretarSolicitud("viaje de pareja", {
    cliente: clienteFalso({ presupuesto: 700000, dias: 4, preferencias: ["pareja", "inventado"], municipio: "Ciudad Inexistente" }),
  });
  assert.equal(r.modo, "ia");
  assert.equal(r.presupuesto, 700000);
  assert.equal(r.dias, 4);
  assert.deepEqual(r.preferencias, ["pareja"]);
  assert.equal(r.municipio, null);
  assert.match(r.resumen, /4 días/);
});

test("con IA: si el modelo falla o responde algo inválido, cae a la interpretación básica", async () => {
  const falla = { messages: { create: async () => { throw new Error("sin conexión"); } } };
  const r1 = await interpretarSolicitud("2 días con 300 mil para la familia", { cliente: falla });
  assert.equal(r1.modo, "basico");
  assert.equal(r1.dias, 2);
  assert.equal(r1.presupuesto, 300000);

  const r2 = await interpretarSolicitud("2 días", { cliente: clienteFalso({ dias: 999 }) }); // fuera de rango
  assert.equal(r2.modo, "basico");
});

test("endpoint: exige sesión, valida el texto y responde en modo básico sin API key", async () => {
  assert.equal((await request(app).post("/api/v1/itinerarios/interpretar").send({ texto: "hola mundo" })).status, 401);
  const { token } = await registrar("turista");
  assert.equal((await request(app).post("/api/v1/itinerarios/interpretar").set(auth(token)).send({ texto: "ya" })).status, 400);

  const ok = await request(app).post("/api/v1/itinerarios/interpretar").set(auth(token)).send({ texto: "Viaje de aventura de 3 días con 600 mil" });
  assert.equal(ok.status, 200);
  assert.equal(ok.body.modo, "basico");
  assert.equal(ok.body.dias, 3);
  assert.equal(ok.body.presupuesto, 600000);
  assert.deepEqual(ok.body.preferencias, ["aventura"]);
});

test("la interpretación alimenta el motor de scoring: el itinerario solo contiene sitios del catálogo", async () => {
  const prest = await registrar("prestador");
  const p = await Prestador.create({ usuario_id: prest.usuario.id, nombre_negocio: "Selva SAS", categoria: "Naturaleza", municipio: "Morelia", estado_verificacion: "aprobado" });
  await request(app).post("/api/v1/sitios").set(auth(prest.token)).send({
    nombre: "Mirador IA", categoria: "Naturaleza", municipio: "Morelia", precio: 20000, tipo_viaje: "naturaleza,pareja", prestador_id: p.id,
  });
  const turista = await registrar("turista");
  const params = (await request(app).post("/api/v1/itinerarios/interpretar").set(auth(turista.token)).send({ texto: "Escapada romántica de 1 día en Morelia con 100 mil" })).body;
  assert.equal(params.municipio, "Morelia");

  const it = await request(app).post("/api/v1/itinerarios").set(auth(turista.token)).send({
    presupuesto: params.presupuesto, dias: params.dias, preferencias: params.preferencias.join(","), municipio: params.municipio,
  });
  assert.equal(it.status, 201);
  assert.ok(it.body.items.length > 0);
  assert.ok(it.body.items.every((i) => i.sitio.municipio === "Morelia"));
});
