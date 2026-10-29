const test = require("node:test");
const assert = require("node:assert/strict");
const { sequelize, registrar, auth, api, enDias } = require("./helpers");
const { Prestador, SitioTuristico, Reserva, Resena, Notificacion, Usuario, Invitacion } = require("../src/models");
const { recordarCalificar } = require("../src/services/reservas");
const { DIAS_NUEVO, INVITACIONES_POR_DIA } = require("../src/config/negocio");

test.after(() => sequelize.close());

async function negocio(nombre = "Oferta") {
  const prest = await registrar("prestador");
  const p = await Prestador.create({ usuario_id: prest.usuario.id, nombre_negocio: nombre, categoria: "Naturaleza", municipio: "Florencia", estado_verificacion: "aprobado" });
  return { prest, p };
}
const crearServicio = async ({ prest, p }, nombre) =>
  (await api("post", "/sitios").set(auth(prest.token)).send({ nombre, categoria: "Naturaleza", municipio: "Florencia", precio: 10000, prestador_id: p.id })).body;
async function administrador() {
  const a = await registrar("turista");
  await Usuario.update({ rol: "administrador" }, { where: { id: a.usuario.id } });
  return a;
}

// ---------------------------------------------------------------- servicios nuevos
test("un servicio recién publicado es «nuevo»; uno sin fecha (anterior a este dato) o de hace más de 30 días, no", async () => {
  const n = await negocio();
  const marca = `Nuevo${Date.now()}`;
  const reciente = await crearServicio(n, `${marca} reciente`);
  const antiguo = await crearServicio(n, `${marca} antiguo`);
  const sinFecha = await crearServicio(n, `${marca} sin fecha`);
  await SitioTuristico.update({ fecha_creacion: new Date(Date.now() - (DIAS_NUEVO + 1) * 864e5) }, { where: { id: antiguo.id } });
  await SitioTuristico.update({ fecha_creacion: null }, { where: { id: sinFecha.id } });

  const res = await api("get", `/sitios?texto=${marca}&limit=10`);
  const nuevo = Object.fromEntries(res.body.resultados.map((s) => [s.id, s.es_nuevo]));
  assert.deepEqual(nuevo, { [reciente.id]: true, [antiguo.id]: false, [sinFecha.id]: false });

  assert.equal((await api("get", `/sitios/${reciente.id}`)).body.es_nuevo, true);
  assert.equal((await api("get", `/sitios/${sinFecha.id}`)).body.es_nuevo, false);

  // «Más recientes»: el más nuevo primero y los que no tienen fecha al final
  const orden = await api("get", `/sitios?texto=${marca}&orden=recientes&limit=10`);
  assert.deepEqual(orden.body.resultados.map((s) => s.id), [reciente.id, antiguo.id, sinFecha.id]);
});

// ---------------------------------------------------------------- recordatorio para calificar
async function reservaCompletada(diasAtras) {
  const n = await negocio();
  const sitio = await crearServicio(n, "Servicio para calificar");
  const t = await registrar("turista");
  const r = (await api("post", "/reservas").set(auth(t.token)).send({ sitio_id: sitio.id, fecha_servicio: enDias(5) })).body;
  await Reserva.update({ estado: "completada", fecha_servicio: enDias(-diasAtras) }, { where: { id: r.id } });
  return { t, reserva: r };
}
const recordatorios = (t) => Notificacion.count({ where: { usuario_id: t.usuario.id, tipo: "resena_recordatorio" } });

test("a quien no calificó se le recuerda una sola vez unos días después del servicio", async () => {
  const { t } = await reservaCompletada(5);
  await recordarCalificar();
  assert.equal(await recordatorios(t), 1);
  await recordarCalificar(); // la siguiente ejecución no lo repite
  assert.equal(await recordatorios(t), 1);
});

test("no se recuerda si ya calificó, si el servicio fue ayer o si fue hace más de un mes", async () => {
  const yaCalifico = await reservaCompletada(5);
  const r = await Reserva.findByPk(yaCalifico.reserva.id);
  await Resena.create({ reserva_id: r.id, sitio_id: r.sitio_id, turista_id: r.turista_id, calificacion: 5, comentario: "Muy bien" });
  const ayer = await reservaCompletada(1);
  const antigua = await reservaCompletada(45);
  await recordarCalificar();
  assert.equal(await recordatorios(yaCalifico.t), 0);
  assert.equal(await recordatorios(ayer.t), 0);
  assert.equal(await recordatorios(antigua.t), 0);
});

// ---------------------------------------------------------------- invitar negocios
test("la administración invita a un negocio por correo y ve si se registró", async () => {
  const admin = await administrador();
  const correo = `negocio${Date.now()}@ejemplo.com`;
  const res = await api("post", "/admin/invitaciones").set(auth(admin.token)).send({ correo: ` ${correo.toUpperCase()} `, nombre_negocio: "Finca El Paraíso" });
  assert.equal(res.status, 201, JSON.stringify(res.body));
  assert.equal(res.body.correo, correo); // normalizado

  const listado = async () => (await api("get", "/admin/invitaciones").set(auth(admin.token))).body.find((i) => i.correo === correo);
  assert.deepEqual([(await listado()).registrado, (await listado()).como_negocio], [false, false]);

  const repetida = await api("post", "/admin/invitaciones").set(auth(admin.token)).send({ correo });
  assert.equal(repetida.status, 400);
  assert.match(repetida.body.error, /hace menos de una semana/);

  // El negocio se registra con ese correo: la invitación aparece como registrada
  await api("post", "/auth/registro").send({ nombre: "Finca El Paraíso", correo, password: "clave12345", rol: "prestador", acepta_terminos: true });
  assert.deepEqual([(await listado()).registrado, (await listado()).como_negocio], [true, true]);
});

test("no se invita a un correo que ya tiene cuenta, ni un correo inválido, ni más del tope diario", async () => {
  const admin = await administrador();
  const conCuenta = await registrar("turista");
  const existente = await api("post", "/admin/invitaciones").set(auth(admin.token)).send({ correo: conCuenta.correo });
  assert.equal(existente.status, 400);
  assert.match(existente.body.error, /ya tiene una cuenta/);
  assert.equal((await api("post", "/admin/invitaciones").set(auth(admin.token)).send({ correo: "no-es-correo" })).status, 400);

  await Invitacion.bulkCreate(Array.from({ length: INVITACIONES_POR_DIA }, (_, i) => ({ correo: `tope${i}-${Date.now()}@ejemplo.com`, enviada_por: admin.usuario.id })));
  const demas = await api("post", "/admin/invitaciones").set(auth(admin.token)).send({ correo: `una-mas${Date.now()}@ejemplo.com` });
  assert.equal(demas.status, 429);
});
