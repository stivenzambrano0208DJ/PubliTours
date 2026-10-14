const test = require("node:test");
const assert = require("node:assert/strict");
const { request, app, sequelize, registrar, auth } = require("./helpers");
const { Prestador, SitioTuristico, Reserva } = require("../src/models");
const { celda } = require("../src/utils/csv");

test.after(() => sequelize.close());

const api = (m, url) => request(app)[m](`/api/v1${url}`);

// Un negocio con dos servicios y reservas repartidas en enero y febrero de 2031.
async function escenario() {
  const prest = await registrar("prestador");
  const p = await Prestador.create({ usuario_id: prest.usuario.id, nombre_negocio: "Stats", categoria: "Naturaleza", municipio: "Florencia", estado_verificacion: "aprobado" });
  const crearSitio = (nombre) => SitioTuristico.create({ nombre, categoria: "Naturaleza", municipio: "Florencia", precio: 10000, prestador_id: p.id });
  const rio = await crearSitio("Río");
  const cascada = await crearSitio("=Cascada"); // un nombre que Excel leería como fórmula
  const t = await registrar("turista");
  const r = (sitio, fecha_servicio, estado, personas, total) =>
    Reserva.create({
      turista_id: t.usuario.id, sitio_id: sitio.id, prestador_id: p.id, fecha_servicio, estado, personas, total,
      // las aceptadas llevan su comisión estimada del 10 %, congelada al confirmar
      ...(["confirmada", "completada"].includes(estado) ? { comision_pct: 10, comision: total / 10 } : {}),
    });
  await r(rio, "2031-01-10", "confirmada", 2, 100000);
  await r(rio, "2031-01-20", "completada", 3, 150000);
  await r(cascada, "2031-02-05", "confirmada", 1, 40000);
  await r(rio, "2031-02-06", "pendiente", 2, 90000);
  await r(rio, "2031-02-07", "rechazada", 2, 80000);
  await r(rio, "2031-02-08", "cancelada", 2, 70000);
  await r(rio, "2032-06-01", "confirmada", 1, 5000); // fuera del periodo consultado
  return { prest };
}
const periodo = "desde=2031-01-01&hasta=2031-02-28";

test("las estadísticas salen de las reservas reales del periodo", async () => {
  const { prest } = await escenario();
  const res = await api("get", `/prestadores/me/estadisticas?${periodo}`).set(auth(prest.token));
  assert.equal(res.status, 200);
  const { totales, por_mes, por_servicio } = res.body;

  assert.equal(totales.solicitudes, 6);
  assert.equal(totales.confirmadas, 3); // confirmadas + completadas
  assert.equal(totales.ingresos, 290000); // solo lo confirmado o completado
  assert.equal(totales.comision, 29000); // 10 % de lo aceptado
  assert.equal(totales.neto, 261000);
  assert.equal(totales.comision_pct, 10);
  assert.equal(totales.personas, 6);
  assert.equal(totales.ticket_promedio, Math.round(290000 / 3));
  assert.equal(totales.tasa_aceptacion, 75); // 3 aceptadas de 4 respondidas (la pendiente y la cancelada no cuentan)
  assert.deepEqual(totales.por_estado, { pendiente: 1, confirmada: 2, completada: 1, rechazada: 1, cancelada: 1, no_asistio: 0 });

  assert.deepEqual(por_mes, [
    { mes: "2031-01", solicitudes: 2, confirmadas: 2, ingresos: 250000, comision: 25000 },
    { mes: "2031-02", solicitudes: 4, confirmadas: 1, ingresos: 40000, comision: 4000 },
  ]);
  assert.deepEqual(por_servicio.map((s) => [s.nombre, s.reservas, s.ingresos]), [["Río", 2, 250000], ["=Cascada", 1, 40000]]);
});

test("un periodo sin reservas devuelve ceros y sin porcentajes inventados", async () => {
  const { prest } = await escenario();
  const res = await api("get", "/prestadores/me/estadisticas?desde=2040-01-01&hasta=2040-12-31").set(auth(prest.token));
  assert.equal(res.body.totales.solicitudes, 0);
  assert.equal(res.body.totales.ingresos, 0);
  assert.equal(res.body.totales.tasa_aceptacion, null);
  assert.equal(res.body.totales.ticket_promedio, null);
  assert.deepEqual(res.body.por_mes, []);
});

test("sin fechas usa los últimos meses y valida el periodo", async () => {
  const { prest } = await escenario();
  assert.equal((await api("get", "/prestadores/me/estadisticas").set(auth(prest.token))).status, 200);
  assert.equal((await api("get", "/prestadores/me/estadisticas?desde=ayer").set(auth(prest.token))).status, 400);
  assert.equal((await api("get", "/prestadores/me/estadisticas?desde=2031-03-01&hasta=2031-01-01").set(auth(prest.token))).status, 400);
  assert.equal((await api("get", "/prestadores/me/estadisticas?desde=2020-01-01&hasta=2031-01-01").set(auth(prest.token))).status, 400);
});

test("solo el prestador ve sus estadísticas", async () => {
  const t = await registrar("turista");
  assert.equal((await api("get", "/prestadores/me/estadisticas")).status, 401);
  assert.equal((await api("get", "/prestadores/me/estadisticas").set(auth(t.token))).status, 403);
  assert.equal((await api("get", "/prestadores/me/estadisticas.csv").set(auth(t.token))).status, 403);
});

test("el CSV tiene una fila por reserva, sin datos del turista y sin fórmulas peligrosas", async () => {
  const { prest } = await escenario();
  const res = await api("get", `/prestadores/me/estadisticas.csv?${periodo}`).set(auth(prest.token));
  assert.equal(res.status, 200);
  assert.match(res.headers["content-type"], /text\/csv/);
  assert.match(res.headers["content-disposition"], /reservas-2031-01-01-a-2031-02-28\.csv/);

  const texto = res.text.replace(/^﻿/, "");
  const filas = texto.trim().split("\r\n");
  assert.equal(filas[0], "codigo;fecha_servicio;servicio;tipo;personas;ninos;total_cop;comision_estimada_cop;neto_estimado_cop;estado;fecha_solicitud");
  assert.equal(filas.length, 1 + 6);
  assert.match(filas[1], /^PT-[A-Z0-9]{6};2031-01-10;Río;servicio;2;0;100000;10000;90000;confirmada;/);
  assert.ok(filas.some((f) => f.includes(";2;0;90000;;;pendiente;"))); // sin aceptar, comisión y neto quedan vacíos
  assert.ok(filas.some((f) => f.includes(";'=Cascada;"))); // la fórmula queda como texto
  assert.ok(!texto.includes("@test.com")); // ni correos ni nombres de turistas
});

test("celda escapa separadores, comillas y saltos de línea", () => {
  assert.equal(celda("a;b"), '"a;b"');
  assert.equal(celda('di "hola"'), '"di ""hola"""');
  assert.equal(celda("+57"), "'+57");
  assert.equal(celda(null), "");
  assert.equal(celda(12), "12");
});
