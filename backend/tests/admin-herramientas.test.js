const test = require("node:test");
const nodemailer = require("nodemailer");
const assert = require("node:assert/strict");
const { sequelize, registrar, auth, api } = require("./helpers");
const { Prestador, SitioTuristico, Reserva, Usuario, Notificacion, Auditoria } = require("../src/models");

test.after(() => sequelize.close());


async function admin() {
  const a = await registrar("turista");
  await Usuario.update({ rol: "administrador" }, { where: { id: a.usuario.id } });
  return a;
}
async function negocio(estado_verificacion = "aprobado") {
  const prest = await registrar("prestador");
  const p = await Prestador.create({ usuario_id: prest.usuario.id, nombre_negocio: `Negocio ${prest.usuario.id}`, categoria: "Naturaleza", municipio: "Florencia", estado_verificacion });
  return { prest, p };
}
const ultimas = (actor_id) => Auditoria.findAll({ where: { actor_id }, order: [["id", "ASC"]] });

test("cada acción de moderación queda en el historial con quién la hizo", async () => {
  const a = await admin();
  const { p } = await negocio("pendiente");
  const { prest: dueno, p: aprobado } = await negocio();
  const sitio = await SitioTuristico.create({ nombre: "Cascada Auditada", categoria: "Naturaleza", municipio: "Florencia", precio: 1000, prestador_id: aprobado.id });
  const turista = await registrar("turista");

  await api("patch", `/prestadores/${p.id}/verificar`).set(auth(a.token)).send({ estado_verificacion: "rechazado", motivo: "Falta el RNT" });
  await api("patch", `/prestadores/${p.id}/verificar`).set(auth(a.token)).send({ estado_verificacion: "aprobado" });
  await api("patch", `/admin/sitios/${sitio.id}/estado`).set(auth(a.token)).send({ estado: "oculto", motivo: "Fotos engañosas" });
  await api("patch", `/admin/usuarios/${turista.usuario.id}/estado`).set(auth(a.token)).send({ activo: false });
  await api("patch", `/admin/usuarios/${turista.usuario.id}/estado`).set(auth(a.token)).send({ activo: true });
  assert.ok(dueno);

  const acciones = (await ultimas(a.usuario.id)).map((x) => [x.accion, x.entidad]);
  assert.deepEqual(acciones, [
    ["negocio_rechazado", "negocio"], ["negocio_aprobado", "negocio"], ["servicio_ocultado", "servicio"],
    ["usuario_suspendido", "usuario"], ["usuario_reactivado", "usuario"],
  ]);
  const rechazo = (await ultimas(a.usuario.id))[0];
  assert.match(rechazo.detalle, /Falta el RNT/);
  assert.equal(rechazo.entidad_id, p.id);

  const lista = await api("get", "/admin/auditoria?accion=servicio_ocultado").set(auth(a.token));
  assert.equal(lista.status, 200);
  assert.ok(lista.body.resultados.length >= 1);
  assert.ok(lista.body.resultados.every((x) => x.accion === "servicio_ocultado"));
  assert.equal(lista.body.resultados[0].actor.id, a.usuario.id);
});

test("las acciones que fallan no dejan registro", async () => {
  const a = await admin();
  await api("patch", "/admin/usuarios/999999/estado").set(auth(a.token)).send({ activo: false });
  await api("patch", "/admin/sitios/999999/estado").set(auth(a.token)).send({ estado: "oculto" });
  assert.equal((await ultimas(a.usuario.id)).length, 0);
});

test("el historial pagina de la más reciente a la más antigua y solo lo ve un administrador", async () => {
  const a = await admin();
  for (let i = 0; i < 3; i++) await Auditoria.create({ actor_id: a.usuario.id, accion: "prueba_paginacion", entidad: "x", detalle: `n${i}` });
  const p1 = await api("get", "/admin/auditoria?accion=prueba_paginacion&limit=2").set(auth(a.token));
  assert.equal(p1.body.total, 3);
  assert.equal(p1.body.total_paginas, 2);
  assert.deepEqual(p1.body.resultados.map((x) => x.detalle), ["n2", "n1"]);
  const p2 = await api("get", "/admin/auditoria?accion=prueba_paginacion&limit=2&page=2").set(auth(a.token));
  assert.deepEqual(p2.body.resultados.map((x) => x.detalle), ["n0"]);

  const t = await registrar("turista");
  assert.equal((await api("get", "/admin/auditoria").set(auth(t.token))).status, 403);
  assert.equal((await api("get", "/admin/auditoria")).status, 401);
});

test("un anuncio llega solo a los prestadores indicados y queda registrado", async () => {
  const a = await admin();
  const aprobado = await negocio("aprobado");
  const pendiente = await negocio("pendiente");
  const turista = await registrar("turista");
  const mensaje = "Mañana habrá mantenimiento de la plataforma de 2 a 4 a. m.";
  const cuenta = (usuario_id) => Notificacion.count({ where: { usuario_id, tipo: "anuncio_admin" } });

  const res = await api("post", "/admin/anuncios").set(auth(a.token)).send({ mensaje, destinatarios: "aprobados" });
  assert.equal(res.status, 201);
  assert.ok(res.body.enviados >= 1);
  assert.equal(await cuenta(aprobado.prest.usuario.id), 1);
  assert.equal(await cuenta(pendiente.prest.usuario.id), 0); // aún no aprobado
  assert.equal(await cuenta(turista.usuario.id), 0); // nunca a turistas

  await api("post", "/admin/anuncios").set(auth(a.token)).send({ mensaje, destinatarios: "todos" });
  assert.equal(await cuenta(pendiente.prest.usuario.id), 1);
  assert.equal(await cuenta(aprobado.prest.usuario.id), 2);

  const registro = (await ultimas(a.usuario.id)).filter((x) => x.accion === "anuncio_enviado");
  assert.equal(registro.length, 2);
  assert.match(registro[0].detalle, /mantenimiento/);
});

test("el anuncio se valida y no lo envía un no administrador", async () => {
  const a = await admin();
  const corto = await api("post", "/admin/anuncios").set(auth(a.token)).send({ mensaje: "hola", destinatarios: "todos" });
  assert.equal(corto.status, 400);
  const sinDestino = await api("post", "/admin/anuncios").set(auth(a.token)).send({ mensaje: "Un anuncio suficientemente largo" });
  assert.equal(sinDestino.status, 400);
  const largo = await api("post", "/admin/anuncios").set(auth(a.token)).send({ mensaje: "x".repeat(501), destinatarios: "todos" });
  assert.equal(largo.status, 400);

  const { prest } = await negocio();
  assert.equal((await api("post", "/admin/anuncios").set(auth(prest.token)).send({ mensaje: "Un anuncio suficientemente largo", destinatarios: "todos" })).status, 403);
});

test("las tendencias suman por mes, rellenan los meses vacíos y no exponen personas", async () => {
  const a = await admin();
  const { p } = await negocio();
  const sitio = await SitioTuristico.create({ nombre: "Tendencia", categoria: "Naturaleza", municipio: "Florencia", precio: 1000, prestador_id: p.id });
  const t = await registrar("turista");
  const nueva = (estado, total, fecha_solicitud) =>
    Reserva.create({ turista_id: t.usuario.id, sitio_id: sitio.id, prestador_id: p.id, fecha_servicio: "2031-05-01", estado, personas: 1, total, fecha_solicitud });
  await nueva("confirmada", 100000, "2031-01-15T10:00:00");
  await nueva("pendiente", 50000, "2031-01-20T10:00:00");
  await nueva("completada", 30000, "2031-03-02T10:00:00");

  const res = await api("get", "/admin/tendencias?desde=2031-01-01&hasta=2031-03-31").set(auth(a.token));
  assert.equal(res.status, 200);
  const por = Object.fromEntries(res.body.por_mes.map((m) => [m.mes, m]));
  assert.deepEqual(res.body.por_mes.map((m) => m.mes), ["2031-01", "2031-02", "2031-03"]);
  assert.equal(por["2031-01"].solicitudes, 2);
  assert.equal(por["2031-01"].aceptadas, 1);
  assert.equal(por["2031-01"].valor_aceptado, 100000);
  assert.equal(por["2031-02"].solicitudes, 0); // mes sin actividad, pero presente
  assert.equal(por["2031-03"].valor_aceptado, 30000);
  assert.equal(res.body.totales.solicitudes, 3);
  assert.equal(res.body.totales.valor_aceptado, 130000);
  assert.ok(!JSON.stringify(res.body).includes("@test.com"));
});

test("las tendencias cuentan los registros nuevos del mes actual y validan el periodo", async () => {
  const a = await admin();
  await registrar("turista");
  await registrar("prestador");
  const res = await api("get", "/admin/tendencias").set(auth(a.token));
  assert.equal(res.status, 200);
  const mesActual = new Date().toLocaleDateString("en-CA").slice(0, 7);
  const actual = res.body.por_mes.find((m) => m.mes === mesActual);
  assert.ok(actual.turistas_nuevos >= 1);
  assert.ok(actual.prestadores_nuevos >= 1);

  assert.equal((await api("get", "/admin/tendencias?desde=mañana").set(auth(a.token))).status, 400);
  assert.equal((await api("get", "/admin/tendencias?desde=2020-01-01&hasta=2031-01-01").set(auth(a.token))).status, 400);
  const t = await registrar("turista");
  assert.equal((await api("get", "/admin/tendencias").set(auth(t.token))).status, 403);
});

test("el CSV de tendencias trae una fila por mes", async () => {
  const a = await admin();
  const res = await api("get", "/admin/tendencias.csv?desde=2031-01-01&hasta=2031-02-28").set(auth(a.token));
  assert.equal(res.status, 200);
  assert.match(res.headers["content-type"], /text\/csv/);
  assert.match(res.headers["content-disposition"], /tendencias-2031-01-01-a-2031-02-28\.csv/);
  const filas = res.text.replace(/^﻿/, "").trim().split("\r\n");
  assert.equal(filas[0], "mes;turistas_nuevos;prestadores_nuevos;solicitudes;aceptadas;valor_aceptado_cop;comision_estimada_cop");
  assert.equal(filas.length, 3);
  assert.match(filas[1], /^2031-01;/);
});

test("al aprobar o rechazar un negocio, su dueño recibe también un correo con el resultado", async () => {
  const a = await admin();
  const { prest: aprobada, p: pA } = await negocio("pendiente");
  const { prest: rechazada, p: pR } = await negocio("pendiente");

  const enviados = [];
  const original = nodemailer.createTransport;
  nodemailer.createTransport = () => ({ sendMail: async (m) => { enviados.push(m); } });
  const prev = { u: process.env.EMAIL_USER, p: process.env.EMAIL_PASS };
  process.env.EMAIL_USER = "prueba@test.com";
  process.env.EMAIL_PASS = "clave";
  try {
    await api("patch", `/prestadores/${pA.id}/verificar`).set(auth(a.token)).send({ estado_verificacion: "aprobado" });
    await api("patch", `/prestadores/${pR.id}/verificar`).set(auth(a.token)).send({ estado_verificacion: "rechazado", motivo: "Falta el RNT" });
    await new Promise((r) => setTimeout(r, 300)); // el correo se envía sin bloquear la respuesta
  } finally {
    nodemailer.createTransport = original;
    process.env.EMAIL_USER = prev.u ?? "";
    process.env.EMAIL_PASS = prev.p ?? "";
  }

  const aDueno = enviados.find((m) => m.to === aprobada.usuario.correo);
  assert.ok(aDueno, "el negocio aprobado debe recibir un correo");
  assert.match(aDueno.subject, /aprobado/i);
  assert.ok(aDueno.html.includes(pA.nombre_negocio));
  assert.ok(aDueno.html.includes("/mi-negocio"));

  const rDueno = enviados.find((m) => m.to === rechazada.usuario.correo);
  assert.ok(rDueno, "el negocio rechazado debe recibir un correo");
  assert.ok(rDueno.html.includes("Falta el RNT"), "el correo explica el motivo");
  assert.ok(!rDueno.subject.toLowerCase().includes("¡tu negocio fue aprobado"));
  assert.equal(enviados.filter((m) => m.to === aprobada.usuario.correo).length, 1, "un solo correo por decisión");
});
