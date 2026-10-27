const test = require("node:test");
const assert = require("node:assert/strict");
const { sequelize, registrar, auth, api, enDias } = require("./helpers");
const { Prestador, SitioTuristico, Reserva, Usuario } = require("../src/models");
const { comisionPorcentaje, calcularComision } = require("../src/config/negocio");

test.after(() => sequelize.close());


async function servicio(precio = 100000) {
  const prest = await registrar("prestador");
  const p = await Prestador.create({ usuario_id: prest.usuario.id, nombre_negocio: "Comisión", categoria: "Naturaleza", municipio: "Florencia", estado_verificacion: "aprobado" });
  const sitio = await SitioTuristico.create({ nombre: "Servicio comisión", categoria: "Naturaleza", municipio: "Florencia", precio, prestador_id: p.id });
  return { prest, p, sitio };
}
const solicitar = async (sitio, dias, personas = 1) => {
  const t = await registrar("turista");
  return { t, reserva: (await api("post", "/reservas").set(auth(t.token)).send({ sitio_id: sitio.id, fecha_servicio: enDias(dias), personas })).body };
};
const recargar = (id) => Reserva.findByPk(id);

// Cambia el porcentaje solo durante una prueba y lo deja como estaba.
async function conComision(valor, fn) {
  const antes = process.env.COMISION_PORCENTAJE;
  process.env.COMISION_PORCENTAJE = String(valor);
  try { await fn(); } finally { if (antes === undefined) delete process.env.COMISION_PORCENTAJE; else process.env.COMISION_PORCENTAJE = antes; }
}

test("el porcentaje por defecto es 10 y un valor inválido vuelve al por defecto", async () => {
  assert.equal(comisionPorcentaje(), 10);
  await conComision(15, async () => assert.equal(comisionPorcentaje(), 15));
  await conComision(0, async () => assert.equal(comisionPorcentaje(), 0));
  for (const malo of ["abc", "-5", "80"]) await conComision(malo, async () => assert.equal(comisionPorcentaje(), 10));
});

test("la comisión se redondea a centavos", () => {
  assert.equal(calcularComision(100000, 10), 10000);
  assert.equal(calcularComision(33333, 10), 3333.3);
  assert.equal(calcularComision(10.05, 10), 1.01); // 1.005 → centavos
  assert.equal(calcularComision(0, 10), 0);
});

test("al confirmar se congela la comisión estimada; antes de confirmar no hay", async () => {
  const { prest, sitio } = await servicio(20000);
  const { reserva } = await solicitar(sitio, 10, 5); // 5 × 20.000 = 100.000

  const pendiente = await recargar(reserva.id);
  assert.equal(pendiente.comision, null);
  assert.equal(pendiente.comision_pct, null);

  assert.equal((await api("patch", `/reservas/${reserva.id}/confirmar`).set(auth(prest.token))).status, 200);
  const confirmada = await recargar(reserva.id);
  assert.equal(Number(confirmada.comision_pct), 10);
  assert.equal(Number(confirmada.comision), 10000);
});

test("cambiar el porcentaje después no toca las reservas ya confirmadas", async () => {
  const { prest, sitio } = await servicio(20000);
  const a = await solicitar(sitio, 11, 5);
  const b = await solicitar(sitio, 12, 5);
  await api("patch", `/reservas/${a.reserva.id}/confirmar`).set(auth(prest.token));

  await conComision(20, async () => {
    await api("patch", `/reservas/${b.reserva.id}/confirmar`).set(auth(prest.token));
  });
  assert.equal(Number((await recargar(a.reserva.id)).comision), 10000); // sigue al 10 %
  assert.equal(Number((await recargar(b.reserva.id)).comision), 20000); // la nueva, al 20 %
  assert.equal(Number((await recargar(b.reserva.id)).comision_pct), 20);
});

test("modificar una reserva confirmada borra su comisión hasta que se confirme de nuevo con el total nuevo", async () => {
  const { prest, sitio } = await servicio(20000);
  const { t, reserva } = await solicitar(sitio, 13, 5);
  await api("patch", `/reservas/${reserva.id}/confirmar`).set(auth(prest.token));

  const edicion = await api("patch", `/reservas/${reserva.id}/editar`).set(auth(t.token)).send({ fecha_servicio: enDias(13), personas: 2 });
  assert.equal(edicion.status, 200);
  const editada = await recargar(reserva.id);
  assert.equal(editada.estado, "pendiente");
  assert.equal(editada.comision, null);

  await api("patch", `/reservas/${reserva.id}/confirmar`).set(auth(prest.token));
  assert.equal(Number((await recargar(reserva.id)).comision), 4000); // 10 % de 2 × 20.000
});

test("rechazar o cancelar no genera comisión", async () => {
  const { prest, sitio } = await servicio(20000);
  const a = await solicitar(sitio, 14);
  const b = await solicitar(sitio, 15);
  await api("patch", `/reservas/${a.reserva.id}/rechazar`).set(auth(prest.token)).send({});
  await api("patch", `/reservas/${b.reserva.id}/cancelar`).set(auth(b.t.token));
  assert.equal((await recargar(a.reserva.id)).comision, null);
  assert.equal((await recargar(b.reserva.id)).comision, null);
});

test("el prestador ve ingresos, comisión y neto de lo aceptado en sus estadísticas", async () => {
  const { prest, sitio } = await servicio(20000);
  const a = await solicitar(sitio, 16, 5); // 100.000
  const b = await solicitar(sitio, 17, 2); // 40.000
  await solicitar(sitio, 18, 3); // pendiente: no cuenta
  await api("patch", `/reservas/${a.reserva.id}/confirmar`).set(auth(prest.token));
  await api("patch", `/reservas/${b.reserva.id}/confirmar`).set(auth(prest.token));

  const { body } = await api("get", `/prestadores/me/estadisticas?desde=${enDias(0)}&hasta=${enDias(30)}`).set(auth(prest.token));
  assert.equal(body.totales.ingresos, 140000);
  assert.equal(body.totales.comision, 14000);
  assert.equal(body.totales.neto, 126000);
  assert.equal(body.totales.comision_pct, 10);
});

test("la plataforma ve la comisión estimada total en las tendencias", async () => {
  const { prest, sitio } = await servicio(20000);
  const { reserva } = await solicitar(sitio, 19, 5);
  await api("patch", `/reservas/${reserva.id}/confirmar`).set(auth(prest.token));

  const admin = await registrar("turista");
  await Usuario.update({ rol: "administrador" }, { where: { id: admin.usuario.id } });
  const mes = new Date().toLocaleDateString("en-CA").slice(0, 7);
  const { body } = await api("get", `/admin/tendencias?desde=${mes}-01&hasta=${enDias(0)}`).set(auth(admin.token));
  assert.ok(body.totales.comision_estimada >= 10000);
  assert.ok(body.por_mes.find((m) => m.mes === mes).comision_estimada >= 10000);
});

test("la configuración pública expone el porcentaje vigente sin pedir sesión", async () => {
  const res = await api("get", "/configuracion");
  assert.equal(res.status, 200);
  assert.equal(res.body.comision_pct, 10);
  assert.deepEqual(res.body.politicas_cancelacion, { flexible: 1, moderada: 3, estricta: 7 });
  await conComision(12, async () => assert.equal((await api("get", "/configuracion")).body.comision_pct, 12));
});
