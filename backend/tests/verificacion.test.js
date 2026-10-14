const test = require("node:test");
const assert = require("node:assert/strict");
const crypto = require("crypto");
const { request, app, sequelize, registrar, auth } = require("./helpers");
const { Usuario, CodigoVerificacion, Prestador } = require("../src/models");
const { VERSION_TERMINOS } = require("../src/config/terminos");

test.after(() => sequelize.close());

const api = (m, url) => request(app)[m](`/api/v1${url}`);
const sha = (t) => crypto.createHash("sha256").update(t).digest("hex");
const manana = () => new Date(Date.now() + 864e5).toISOString().slice(0, 10);

// Fija un código conocido para el usuario (en la base solo se guarda su hash).
async function fijarCodigo(usuario_id, codigo, extra = {}) {
  await CodigoVerificacion.update({ usado: true }, { where: { usuario_id } });
  return CodigoVerificacion.create({ usuario_id, codigo_hash: sha(codigo), expira: new Date(Date.now() + 3600000), ...extra });
}

test("registro: exige aceptar los términos, los guarda con su versión y deja el correo sin verificar", async () => {
  const datos = { nombre: "Ana", correo: `ana${Date.now()}@test.com`, password: "clave12345" };
  const sin = await api("post", "/auth/registro").send(datos);
  assert.equal(sin.status, 400);
  assert.ok(sin.body.detalles.some((d) => d.campo === "acepta_terminos"));

  const ok = await api("post", "/auth/registro").send({ ...datos, acepta_terminos: true });
  assert.equal(ok.status, 201);
  assert.equal(ok.body.usuario.correo_verificado, false);

  const u = await Usuario.findByPk(ok.body.usuario.id);
  assert.ok(u.acepto_terminos_en);
  assert.equal(u.version_terminos, VERSION_TERMINOS);
  assert.equal(await CodigoVerificacion.count({ where: { usuario_id: u.id, usado: false } }), 1); // se generó un código

  assert.equal((await api("get", "/usuarios/me").set(auth(ok.body.token))).body.correo_verificado, false);
});

test("sin verificar el correo no se puede reservar, calificar ni enviar un negocio a revisión", async () => {
  const prest = await registrar("prestador");
  const p = await Prestador.create({ usuario_id: prest.usuario.id, nombre_negocio: "Negocio", categoria: "Naturaleza", municipio: "Florencia", estado_verificacion: "aprobado" });
  const sitio = (await api("post", "/sitios").set(auth(prest.token)).send({ nombre: "Sitio", categoria: "Naturaleza", municipio: "Florencia", precio: 0, prestador_id: p.id })).body;

  const nuevo = await registrar("turista", { verificado: false });
  const reservar = await api("post", "/reservas").set(auth(nuevo.token)).send({ sitio_id: sitio.id, fecha_servicio: manana() });
  assert.equal(reservar.status, 403);
  assert.equal(reservar.body.codigo, "CORREO_NO_VERIFICADO");
  assert.equal((await api("post", "/reservas/1/resena").set(auth(nuevo.token)).send({ calificacion: 5 })).body.codigo, "CORREO_NO_VERIFICADO");

  const negocio = await registrar("prestador", { verificado: false });
  const perfil = await api("post", "/prestadores").set(auth(negocio.token)).send({ nombre_negocio: "Mi finca", categoria: "Hospedaje", municipio: "Florencia" });
  const envio = await api("post", `/prestadores/${perfil.body.id}/enviar-revision`).set(auth(negocio.token));
  assert.equal(envio.status, 403);
  assert.equal(envio.body.codigo, "CORREO_NO_VERIFICADO");

  // lo demás sigue funcionando sin verificar: navegar, ver el perfil, favoritos
  assert.equal((await api("get", "/usuarios/me").set(auth(nuevo.token))).status, 200);
  assert.equal((await api("post", `/favoritos/${sitio.id}`).set(auth(nuevo.token))).status, 201);

  // con el correo verificado la misma reserva sí pasa
  await Usuario.update({ correo_verificado: true }, { where: { id: nuevo.usuario.id } });
  assert.equal((await api("post", "/reservas").set(auth(nuevo.token)).send({ sitio_id: sitio.id, fecha_servicio: manana() })).status, 201);
});

test("verificar el correo con el código: correcto, incorrecto, un solo uso y vencido", async () => {
  const { token, usuario } = await registrar("turista", { verificado: false });
  await fijarCodigo(usuario.id, "123456");

  assert.equal((await api("post", "/auth/verificar-correo").send({ codigo: "123456" })).status, 401); // exige sesión
  assert.equal((await api("post", "/auth/verificar-correo").set(auth(token)).send({ codigo: "12" })).status, 400); // formato
  const mal = await api("post", "/auth/verificar-correo").set(auth(token)).send({ codigo: "000000" });
  assert.equal(mal.status, 400);
  assert.equal((await Usuario.findByPk(usuario.id)).correo_verificado, false);

  const ok = await api("post", "/auth/verificar-correo").set(auth(token)).send({ codigo: "123456" });
  assert.equal(ok.status, 200);
  assert.equal(ok.body.correo_verificado, true);
  assert.equal((await Usuario.findByPk(usuario.id)).correo_verificado, true);
  assert.equal((await api("get", "/usuarios/me").set(auth(token))).body.correo_verificado, true);

  // vencido
  const otro = await registrar("turista", { verificado: false });
  await fijarCodigo(otro.usuario.id, "654321", { expira: new Date(Date.now() - 1000) });
  assert.equal((await api("post", "/auth/verificar-correo").set(auth(otro.token)).send({ codigo: "654321" })).status, 400);
});

test("el código se bloquea tras 5 intentos fallidos", async () => {
  const { token, usuario } = await registrar("turista", { verificado: false });
  await fijarCodigo(usuario.id, "111111");
  for (let i = 0; i < 5; i++) {
    assert.equal((await api("post", "/auth/verificar-correo").set(auth(token)).send({ codigo: "999999" })).status, 400);
  }
  const bloqueado = await api("post", "/auth/verificar-correo").set(auth(token)).send({ codigo: "111111" });
  assert.equal(bloqueado.status, 400);
  assert.match(bloqueado.body.error, /Demasiados intentos/);
  assert.equal((await Usuario.findByPk(usuario.id)).correo_verificado, false);
});

test("reenviar el código: invalida el anterior y exige esperar entre envíos", async () => {
  const { token, usuario } = await registrar("turista", { verificado: false });
  await fijarCodigo(usuario.id, "111111");
  // el código del registro y el fijado hace "2 minutos": ya pasó la espera de 60 s
  await CodigoVerificacion.update({ fecha_creacion: new Date(Date.now() - 120000) }, { where: { usuario_id: usuario.id } });

  const reenvio = await api("post", "/auth/reenviar-verificacion").set(auth(token));
  assert.equal(reenvio.status, 200);
  const rapido = await api("post", "/auth/reenviar-verificacion").set(auth(token));
  assert.equal(rapido.status, 400);
  assert.match(rapido.body.error, /Espera \d+ segundos/);

  // el código anterior ya no sirve
  assert.equal((await api("post", "/auth/verificar-correo").set(auth(token)).send({ codigo: "111111" })).status, 400);

  const verificado = await registrar("turista");
  assert.equal((await api("post", "/auth/reenviar-verificacion").set(auth(verificado.token))).status, 400); // ya verificado
});

test("cambiar el correo exige verificarlo de nuevo", async () => {
  const { token, usuario } = await registrar("turista");
  const nuevo = `nuevo${Date.now()}@test.com`;
  const res = await api("put", "/auth/perfil").set(auth(token)).send({ nombre: "Usuario Prueba", correo: nuevo });
  assert.equal(res.status, 200);
  assert.equal(res.body.correo_verificado, false);
  assert.equal(await CodigoVerificacion.count({ where: { usuario_id: usuario.id, usado: false } }), 1);

  // cambiar solo el nombre no pide verificar de nuevo
  await Usuario.update({ correo_verificado: true }, { where: { id: usuario.id } });
  const soloNombre = await api("put", "/auth/perfil").set(auth(token)).send({ nombre: "Otro Nombre", correo: nuevo });
  assert.equal(soloNombre.body.correo_verificado, true);
});

test("los administradores no necesitan verificar el correo", async () => {
  const { requireCorreoVerificado } = require("../src/middlewares/auth");
  let paso = false;
  requireCorreoVerificado({ usuario: { rol: "administrador", correo_verificado: false } }, {}, () => { paso = true; });
  assert.equal(paso, true);
});
