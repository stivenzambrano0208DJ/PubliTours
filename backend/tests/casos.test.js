const test = require("node:test");
const assert = require("node:assert/strict");
const { sequelize, registrar, auth, api, enDias } = require("./helpers");
const { Prestador, Usuario, Notificacion, CasoSoporte, Auditoria } = require("../src/models");
const { CASOS_POR_DIA } = require("../src/config/soporte");

test.after(() => sequelize.close());

const DETALLE = "Llegamos a la hora acordada y el negocio estaba cerrado; nadie contestó el teléfono.";

// Una reserva confirmada (de la turista dada o de una nueva): turista, negocio y la reserva en sí.
async function reserva(turista = null) {
  const prest = await registrar("prestador");
  const p = await Prestador.create({ usuario_id: prest.usuario.id, nombre_negocio: "Casos", categoria: "Naturaleza", municipio: "Florencia", estado_verificacion: "aprobado" });
  const sitio = (await api("post", "/sitios").set(auth(prest.token)).send({ nombre: "Servicio con problema", categoria: "Naturaleza", municipio: "Florencia", precio: 10000, prestador_id: p.id })).body;
  const t = turista || (await registrar("turista"));
  const r = (await api("post", "/reservas").set(auth(t.token)).send({ sitio_id: sitio.id, fecha_servicio: enDias(5) })).body;
  await api("patch", `/reservas/${r.id}/confirmar`).set(auth(prest.token));
  return { prest, t, reserva: r };
}
async function administrador() {
  const a = await registrar("turista");
  await Usuario.update({ rol: "administrador" }, { where: { id: a.usuario.id } });
  return a;
}
const abrir = (quien, reserva_id, extra = {}) => api("post", "/casos").set(auth(quien.token)).send({ reserva_id, motivo: "no_presto_servicio", detalle: DETALLE, ...extra });

test("la turista abre un caso sobre su reserva, lo ve en «Mis casos» y la administración recibe el aviso", async () => {
  const admin = await administrador();
  const { t, reserva: r } = await reserva();
  const res = await abrir(t, r.id);
  assert.equal(res.status, 201);
  assert.equal(res.body.estado, "abierto");
  assert.equal(res.body.servicio, "Servicio con problema");
  assert.equal(res.body.codigo, r.codigo);

  const mios = await api("get", "/casos/mios").set(auth(t.token));
  assert.equal(mios.status, 200);
  assert.deepEqual(mios.body.map((c) => c.id), [res.body.id]);

  const aviso = await Notificacion.findOne({ where: { usuario_id: admin.usuario.id, tipo: "caso_soporte" } });
  assert.ok(aviso, "la administración recibe una notificación");
});

test("el negocio de la reserva también puede abrir un caso; alguien ajeno no sabe que la reserva existe", async () => {
  const { prest, reserva: r } = await reserva();
  assert.equal((await abrir(prest, r.id, { motivo: "no_asistio_turista" })).status, 201);

  const otro = await registrar("turista");
  const ajeno = await abrir(otro, r.id);
  assert.equal(ajeno.status, 404);
  assert.equal(ajeno.body.error, "Reserva no encontrada.");
  assert.equal((await abrir(otro, 99999999)).status, 404);
});

test("valida el motivo y el detalle, y no deja abrir otro caso mientras el anterior no esté resuelto", async () => {
  const { t, reserva: r } = await reserva();
  assert.equal((await abrir(t, r.id, { motivo: "inventado" })).status, 400);
  const corto = await abrir(t, r.id, { detalle: "mal" });
  assert.equal(corto.status, 400);
  assert.match(corto.body.error, /al menos 20 caracteres/);
  assert.equal((await abrir(t, r.id, { detalle: "x".repeat(1001) })).status, 400);

  assert.equal((await abrir(t, r.id)).status, 201);
  const repetido = await abrir(t, r.id);
  assert.equal(repetido.status, 400);
  assert.match(repetido.body.error, /Ya tienes un caso abierto/);
});

test("la administración pone el caso en revisión y lo resuelve con una respuesta que le llega a quien lo abrió", async () => {
  const admin = await administrador();
  const { t, reserva: r } = await reserva();
  const caso = (await abrir(t, r.id)).body;

  const abiertos = await api("get", "/admin/casos").set(auth(admin.token));
  assert.equal(abiertos.status, 200);
  const enLista = abiertos.body.find((c) => c.id === caso.id);
  assert.equal(enLista.abierto_por.rol, "turista");
  assert.equal(enLista.negocio, "Casos");

  const revision = await api("patch", `/admin/casos/${caso.id}`).set(auth(admin.token)).send({ estado: "en_revision" });
  assert.equal(revision.status, 200);
  assert.equal(revision.body.estado, "en_revision");

  const sinRespuesta = await api("patch", `/admin/casos/${caso.id}`).set(auth(admin.token)).send({ estado: "resuelto" });
  assert.equal(sinRespuesta.status, 400);
  assert.match(sinRespuesta.body.error, /respuesta/);

  const respuesta = "Hablamos con el negocio y reprogramó tu visita sin costo.";
  const resuelto = await api("patch", `/admin/casos/${caso.id}`).set(auth(admin.token)).send({ estado: "resuelto", respuesta });
  assert.equal(resuelto.status, 200);
  assert.equal(resuelto.body.estado, "resuelto");
  assert.ok(resuelto.body.resuelto_en);

  const mio = (await api("get", "/casos/mios").set(auth(t.token))).body.find((c) => c.id === caso.id);
  assert.equal(mio.respuesta, respuesta);
  const avisos = await Notificacion.findAll({ where: { usuario_id: t.usuario.id, tipo: "caso_soporte" } });
  assert.equal(avisos.length, 2); // en revisión y resuelto
  assert.ok(avisos.some((n) => n.mensaje.includes(respuesta)));
  assert.equal(await Auditoria.count({ where: { entidad: "caso", entidad_id: caso.id } }), 2);

  const otraVez = await api("patch", `/admin/casos/${caso.id}`).set(auth(admin.token)).send({ estado: "en_revision" });
  assert.equal(otraVez.status, 400); // un caso resuelto ya no cambia
  // y con el caso resuelto se puede abrir uno nuevo sobre la misma reserva
  assert.equal((await abrir(t, r.id)).status, 201);
});

test("la lista de la administración filtra por estado e ignora un estado que no existe", async () => {
  const admin = await administrador();
  for (const estado of ["abierto", "en_revision", "resuelto", "zzz"]) {
    const res = await api("get", `/admin/casos?estado=${estado}`).set(auth(admin.token));
    assert.equal(res.status, 200, estado);
    assert.ok(res.body.every((c) => c.estado === (estado === "zzz" ? "abierto" : estado)), estado);
  }
});

test("una persona no puede abrir más de 5 casos en 24 horas", async () => {
  const t = await registrar("turista");
  const reservas = [];
  for (let i = 0; i <= CASOS_POR_DIA; i++) reservas.push((await reserva(t)).reserva); // una reserva distinta por caso
  for (let i = 0; i < CASOS_POR_DIA; i++) assert.equal((await abrir(t, reservas[i].id)).status, 201);
  const demas = await abrir(t, reservas[CASOS_POR_DIA].id);
  assert.equal(demas.status, 429);
});

test("los casos van en la descarga de datos personales y se borran al eliminar la cuenta", async () => {
  const { t, reserva: r } = await reserva();
  await abrir(t, r.id);
  const datos = await api("get", "/auth/mis-datos").set(auth(t.token));
  assert.equal(datos.body.casos_soporte.length, 1);
  assert.equal(datos.body.casos_soporte[0].detalle, DETALLE);

  await api("patch", `/reservas/${r.id}/cancelar`).set(auth(t.token)); // sin reservas vivas puede eliminar la cuenta
  const eliminar = await api("delete", "/auth/cuenta").set(auth(t.token)).send({ password: "clave12345" });
  assert.equal(eliminar.status, 200, JSON.stringify(eliminar.body));
  assert.equal(await CasoSoporte.count({ where: { abierto_por: t.usuario.id } }), 0);
});
