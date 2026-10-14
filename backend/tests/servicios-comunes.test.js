const test = require("node:test");
const assert = require("node:assert/strict");
const { sequelize, registrar } = require("./helpers");
const { Prestador, Notificacion } = require("../src/models");
const { limitarIA } = require("../src/middlewares/limitarIA");
const notificaciones = require("../src/services/notificacionService");
const { prestadorDeUsuario } = require("../src/services/negocioPropio");
const { ErrorHttp } = require("../src/utils/errores");

test.after(() => sequelize.close());

// Pieza mínima de Express para probar un middleware sin levantar el servidor.
function llamar(middleware, usuarioId) {
  const res = { codigo: null, cuerpo: null, status(c) { this.codigo = c; return this; }, json(b) { this.cuerpo = b; return this; } };
  let siguio = false;
  middleware({ usuario: { id: usuarioId } }, res, () => { siguio = true; });
  return { siguio, res };
}

test("el limitador de IA deja pasar 20 consultas por hora a cada persona y luego responde 429", () => {
  const id = 900000 + Math.floor(Math.random() * 90000);
  for (let i = 0; i < 20; i += 1) assert.equal(llamar(limitarIA, id).siguio, true, `consulta ${i + 1}`);
  const bloqueada = llamar(limitarIA, id);
  assert.equal(bloqueada.siguio, false);
  assert.equal(bloqueada.res.codigo, 429);
  assert.match(bloqueada.res.cuerpo.error, /límite de consultas con IA/);
  // otra persona no se ve afectada
  assert.equal(llamar(limitarIA, id + 1).siguio, true);
});

test("notificarVarios crea una notificación por persona, y notificar solo la de esa persona", async () => {
  const a = await registrar("turista");
  const b = await registrar("turista");
  await notificaciones.notificarVarios([a.usuario.id, b.usuario.id], "anuncio_admin", "Hola a todos");
  assert.equal(await Notificacion.count({ where: { tipo: "anuncio_admin", usuario_id: [a.usuario.id, b.usuario.id] } }), 2);

  await notificaciones.notificar(a.usuario.id, "prueba_servicio", "Solo para A");
  assert.equal(await Notificacion.count({ where: { tipo: "prueba_servicio", usuario_id: a.usuario.id } }), 1);
  assert.equal(await Notificacion.count({ where: { tipo: "prueba_servicio", usuario_id: b.usuario.id } }), 0);
});

test("marcarLeida y la lista solo trabajan con las notificaciones de quien las pide", async () => {
  const dueno = await registrar("turista");
  const otro = await registrar("turista");
  const n = await notificaciones.notificar(dueno.usuario.id, "prueba_servicio", "Privada");
  await assert.rejects(notificaciones.marcarLeida({ id: n.id, usuario_id: otro.usuario.id }), (e) => e instanceof ErrorHttp && e.status === 403);
  await assert.rejects(notificaciones.marcarLeida({ id: 2000000000, usuario_id: dueno.usuario.id }), (e) => e instanceof ErrorHttp && e.status === 404);
  assert.equal((await notificaciones.marcarLeida({ id: n.id, usuario_id: dueno.usuario.id })).leido, true);
  assert.deepEqual((await notificaciones.listarDeUsuario(otro.usuario.id)).map((x) => x.id), []);
});

test("prestadorDeUsuario devuelve el negocio de la cuenta, o null si aún no tiene", async () => {
  const sin = await registrar("turista");
  const con = await registrar("prestador");
  assert.equal(await prestadorDeUsuario(sin.usuario.id), null);
  const p = await Prestador.create({ usuario_id: con.usuario.id, nombre_negocio: "Negocio Común", categoria: "Naturaleza", municipio: "Florencia", estado_verificacion: "aprobado" });
  assert.equal((await prestadorDeUsuario(con.usuario.id)).id, p.id);
});

test("ErrorHttp lleva datos extra opcionales para el cliente", () => {
  const simple = new ErrorHttp(404, "No existe.");
  assert.equal(simple.status, 404);
  assert.equal(simple.extra, undefined);
  const conExtra = new ErrorHttp(400, "Falta algo.", { faltan: ["a", "b"] });
  assert.deepEqual(conExtra.extra, { faltan: ["a", "b"] });
});
