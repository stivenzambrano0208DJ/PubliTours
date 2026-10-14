const test = require("node:test");
const assert = require("node:assert/strict");
const { request, app, sequelize, registrar, auth } = require("./helpers");
const { Prestador, SitioTuristico, Reserva, Notificacion } = require("../src/models");
const { esCancelacionTardia, POLITICAS_CANCELACION } = require("../src/config/negocio");

test.after(() => sequelize.close());

const api = (m, url) => request(app)[m](`/api/v1${url}`);
const enDias = (n) => new Date(Date.now() + n * 864e5).toLocaleDateString("en-CA");

async function negocio() {
  const prest = await registrar("prestador");
  const p = await Prestador.create({ usuario_id: prest.usuario.id, nombre_negocio: "Cancelación", categoria: "Naturaleza", municipio: "Florencia", estado_verificacion: "aprobado" });
  return { prest, p };
}
const crearServicio = async (prest, p, extra = {}) =>
  api("post", "/sitios").set(auth(prest.token)).send({ nombre: "Servicio política", categoria: "Naturaleza", municipio: "Florencia", precio: 10000, prestador_id: p.id, ...extra });

// Reserva confirmada para dentro de `dias` días de un servicio con esa política.
async function reservaConfirmada(politica, dias) {
  const { prest, p } = await negocio();
  const sitio = (await crearServicio(prest, p, { politica_cancelacion: politica })).body;
  const t = await registrar("turista");
  const reserva = (await api("post", "/reservas").set(auth(t.token)).send({ sitio_id: sitio.id, fecha_servicio: enDias(dias) })).body;
  await api("patch", `/reservas/${reserva.id}/confirmar`).set(auth(prest.token));
  return { prest, p, sitio, t, reserva };
}
const cancelar = (t, reserva) => api("patch", `/reservas/${reserva.id}/cancelar`).set(auth(t.token));

test("las políticas exigen 1, 3 y 7 días y cancelar con menos antelación es tardío", () => {
  assert.deepEqual(POLITICAS_CANCELACION, { flexible: 1, moderada: 3, estricta: 7 });
  assert.equal(esCancelacionTardia("flexible", enDias(1)), false); // lo de siempre: el día antes es gratis
  assert.equal(esCancelacionTardia("moderada", enDias(3)), false);
  assert.equal(esCancelacionTardia("moderada", enDias(2)), true);
  assert.equal(esCancelacionTardia("estricta", enDias(7)), false);
  assert.equal(esCancelacionTardia("estricta", enDias(6)), true);
  assert.equal(esCancelacionTardia("inventada", enDias(1)), false); // desconocida: se trata como la por defecto
});

test("un servicio nuevo es flexible, el prestador puede elegir otra y una inválida se rechaza", async () => {
  const { prest, p } = await negocio();
  const porDefecto = await crearServicio(prest, p);
  assert.equal(porDefecto.status, 201);
  assert.equal(porDefecto.body.politica_cancelacion, "flexible");

  const estricta = await crearServicio(prest, p, { politica_cancelacion: "estricta" });
  assert.equal(estricta.body.politica_cancelacion, "estricta");
  assert.equal((await api("get", `/sitios/${estricta.body.id}`)).body.politica_cancelacion, "estricta"); // el turista la ve

  assert.equal((await crearServicio(prest, p, { politica_cancelacion: "relajada" })).status, 400);
});

test("al editar un servicio la política cambia si se envía y se conserva si no", async () => {
  const { prest, p } = await negocio();
  const sitio = (await crearServicio(prest, p, { politica_cancelacion: "moderada" })).body;
  const base = { nombre: "Servicio política", categoria: "Naturaleza", municipio: "Florencia", precio: 10000 };

  await api("put", `/sitios/${sitio.id}`).set(auth(prest.token)).send({ ...base, precio: 12000 });
  assert.equal((await SitioTuristico.findByPk(sitio.id)).politica_cancelacion, "moderada"); // no se envió: igual

  await api("put", `/sitios/${sitio.id}`).set(auth(prest.token)).send({ ...base, politica_cancelacion: "estricta" });
  assert.equal((await SitioTuristico.findByPk(sitio.id)).politica_cancelacion, "estricta");
});

test("un paquete también tiene política de cancelación", async () => {
  const { prest, p } = await negocio();
  const a = (await crearServicio(prest, p)).body;
  const b = (await crearServicio(prest, p)).body;
  const datos = { nombre: "Paquete política", precio: 50000, sitios: [{ sitio_id: a.id, dia: 1 }, { sitio_id: b.id, dia: 2 }] };

  const creado = await api("post", "/paquetes").set(auth(prest.token)).send({ ...datos, politica_cancelacion: "moderada" });
  assert.equal(creado.status, 201);
  assert.equal(creado.body.politica_cancelacion, "moderada");
  const porDefecto = await api("post", "/paquetes").set(auth(prest.token)).send({ ...datos, nombre: "Otro paquete" });
  assert.equal(porDefecto.body.politica_cancelacion, "flexible");

  const editado = await api("put", `/paquetes/${creado.body.id}`).set(auth(prest.token)).send({ ...datos, politica_cancelacion: "estricta" });
  assert.equal(editado.body.politica_cancelacion, "estricta");
  assert.equal((await api("post", "/paquetes").set(auth(prest.token)).send({ ...datos, politica_cancelacion: "x" })).status, 400);
});

test("cancelar una reserva confirmada dentro del plazo no es tardío", async () => {
  const { t, reserva } = await reservaConfirmada("moderada", 5);
  const res = await cancelar(t, reserva);
  assert.equal(res.status, 200);
  assert.equal(res.body.cancelacion_tardia, false);
});

test("cancelar una confirmada con menos antelación que la política es tardío, y el prestador lo sabe", async () => {
  const { prest, t, reserva } = await reservaConfirmada("moderada", 2);
  const res = await cancelar(t, reserva);
  assert.equal(res.status, 200); // cancelar se puede siempre hasta el día anterior
  assert.equal(res.body.estado, "cancelada");
  assert.equal(res.body.cancelacion_tardia, true);

  const aviso = await Notificacion.findOne({ where: { usuario_id: prest.usuario.id, tipo: "reserva_cancelada" }, order: [["id", "DESC"]] });
  assert.match(aviso.mensaje, /cancelación tardía/);
  assert.match(aviso.mensaje, /moderada/);
});

test("lo que era gratis antes sigue siéndolo en la política flexible, y la estricta pide una semana", async () => {
  const flexible = await reservaConfirmada("flexible", 1);
  assert.equal((await cancelar(flexible.t, flexible.reserva)).body.cancelacion_tardia, false);

  const estricta = await reservaConfirmada("estricta", 5);
  assert.equal((await cancelar(estricta.t, estricta.reserva)).body.cancelacion_tardia, true);
  const holgada = await reservaConfirmada("estricta", 9);
  assert.equal((await cancelar(holgada.t, holgada.reserva)).body.cancelacion_tardia, false);
});

test("una solicitud pendiente nunca cuenta como cancelación tardía", async () => {
  const { prest, p } = await negocio();
  const sitio = (await crearServicio(prest, p, { politica_cancelacion: "estricta" })).body;
  const t = await registrar("turista");
  const reserva = (await api("post", "/reservas").set(auth(t.token)).send({ sitio_id: sitio.id, fecha_servicio: enDias(2) })).body;
  const res = await cancelar(t, reserva);
  assert.equal(res.body.estado, "cancelada");
  assert.equal(res.body.cancelacion_tardia, false);
});

test("la reserva conserva la política con la que se hizo aunque el prestador la cambie después", async () => {
  const { prest, sitio, t, reserva } = await reservaConfirmada("estricta", 4);
  assert.equal(reserva.politica_cancelacion, "estricta");

  await api("put", `/sitios/${sitio.id}`).set(auth(prest.token))
    .send({ nombre: sitio.nombre, categoria: "Naturaleza", municipio: "Florencia", precio: 10000, politica_cancelacion: "flexible" });
  assert.equal((await cancelar(t, reserva)).body.cancelacion_tardia, true); // 4 días < 7 de la política original
});

test("el comprobante muestra la política y las cancelaciones tardías aparecen en las estadísticas", async () => {
  const { prest, t, reserva } = await reservaConfirmada("moderada", 2);
  const comprobante = await api("get", `/reservas/${reserva.id}`).set(auth(t.token));
  assert.equal(comprobante.body.politica_cancelacion, "moderada");

  await cancelar(t, reserva);
  const { body } = await api("get", `/prestadores/me/estadisticas?desde=${enDias(0)}&hasta=${enDias(10)}`).set(auth(prest.token));
  assert.equal(body.totales.por_estado.cancelada, 1);
  assert.equal(body.totales.cancelaciones_tardias, 1);
  assert.ok((await Reserva.findByPk(reserva.id)).cancelacion_tardia);
});

test("las reglas que ya existían no cambian: no se cancela el mismo día", async () => {
  const { prest, p } = await negocio();
  const sitio = (await crearServicio(prest, p)).body;
  const t = await registrar("turista");
  const reserva = (await api("post", "/reservas").set(auth(t.token)).send({ sitio_id: sitio.id, fecha_servicio: enDias(1) })).body;
  await Reserva.update({ fecha_servicio: enDias(0) }, { where: { id: reserva.id } });
  assert.equal((await cancelar(t, reserva)).status, 400);
});
