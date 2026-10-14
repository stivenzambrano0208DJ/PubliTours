const test = require("node:test");
const assert = require("node:assert/strict");
const { request, app, sequelize, registrar, auth } = require("./helpers");
const { Prestador, Usuario } = require("../src/models");

test.after(() => sequelize.close());

const api = (m, url) => request(app)[m](`/api/v1${url}`);
const enDias = (n) => new Date(Date.now() + n * 864e5).toLocaleDateString("en-CA");
const PASSWORD = "clave12345";

async function negocioConServicio() {
  const prest = await registrar("prestador");
  const p = await Prestador.create({ usuario_id: prest.usuario.id, nombre_negocio: "Negocio Cuenta", categoria: "Naturaleza", municipio: "Florencia", estado_verificacion: "aprobado", telefono: "3001234567", direccion: "Km 3 vía al río", descripcion: "Un negocio de prueba con descripción suficiente." });
  const sitio = (await api("post", "/sitios").set(auth(prest.token)).send({ nombre: "Servicio Cuenta", categoria: "Naturaleza", municipio: "Florencia", precio: 10000, prestador_id: p.id })).body;
  return { prest, p, sitio };
}

test("descargar mis datos entrega lo propio y nunca contraseñas", async () => {
  const { prest, sitio } = await negocioConServicio();
  const t = await registrar("turista");
  await api("post", "/reservas").set(auth(t.token)).send({ sitio_id: sitio.id, fecha_servicio: enDias(10), nota: "Alergia al maní" });
  await api("post", `/favoritos/${sitio.id}`).set(auth(t.token));

  const res = await api("get", "/auth/mis-datos").set(auth(t.token));
  assert.equal(res.status, 200);
  assert.match(res.headers["content-disposition"], /attachment/);
  assert.equal(res.body.cuenta.correo, t.correo);
  assert.equal(res.body.reservas.length, 1);
  assert.equal(res.body.reservas[0].nota, "Alergia al maní");
  assert.equal(res.body.favoritos.length, 1);
  assert.ok(!JSON.stringify(res.body).includes("password_hash"));
  assert.equal(res.body.negocio, undefined); // un turista no tiene negocio

  const delPrestador = await api("get", "/auth/mis-datos").set(auth(prest.token));
  assert.equal(delPrestador.body.negocio.nombre_negocio, "Negocio Cuenta");
  assert.equal(delPrestador.body.servicios.length, 1);

  assert.equal((await api("get", "/auth/mis-datos")).status, 401); // sin sesión no hay datos
});

test("eliminar la cuenta exige la contraseña y que no queden reservas pendientes", async () => {
  const { sitio } = await negocioConServicio();
  const t = await registrar("turista");
  const reserva = (await api("post", "/reservas").set(auth(t.token)).send({ sitio_id: sitio.id, fecha_servicio: enDias(12) })).body;

  assert.equal((await api("delete", "/auth/cuenta").set(auth(t.token)).send({})).status, 400); // sin contraseña
  const mala = await api("delete", "/auth/cuenta").set(auth(t.token)).send({ password: "otra-clave" });
  assert.equal(mala.status, 400);
  assert.match(mala.body.error, /contraseña/);

  const bloqueada = await api("delete", "/auth/cuenta").set(auth(t.token)).send({ password: PASSWORD });
  assert.equal(bloqueada.status, 400);
  assert.match(bloqueada.body.error, /reserva/);

  await api("patch", `/reservas/${reserva.id}/cancelar`).set(auth(t.token));
  assert.equal((await api("delete", "/auth/cuenta").set(auth(t.token)).send({ password: PASSWORD })).status, 200);
});

test("una cuenta eliminada queda anonimizada, no puede entrar y su correo se puede volver a usar", async () => {
  const { sitio } = await negocioConServicio();
  const t = await registrar("turista");
  const reserva = (await api("post", "/reservas").set(auth(t.token)).send({ sitio_id: sitio.id, fecha_servicio: enDias(14), nota: "Dato personal" })).body;
  await api("patch", `/reservas/${reserva.id}/cancelar`).set(auth(t.token));
  await api("post", `/favoritos/${sitio.id}`).set(auth(t.token));

  assert.equal((await api("delete", "/auth/cuenta").set(auth(t.token)).send({ password: PASSWORD })).status, 200);

  const u = await Usuario.findByPk(t.usuario.id);
  assert.equal(u.nombre, "Cuenta eliminada");
  assert.notEqual(u.correo, t.correo);
  assert.equal(u.activo, false);
  assert.ok(u.eliminado_en);
  const [[{ n }]] = await sequelize.query(`SELECT COUNT(*)::int AS n FROM favoritos WHERE usuario_id = ${u.id}`);
  assert.equal(n, 0);
  const [[{ notas }]] = await sequelize.query(`SELECT COUNT(*)::int AS notas FROM reservas WHERE turista_id = ${u.id} AND nota IS NOT NULL`);
  assert.equal(notas, 0); // el texto libre se borra, la reserva queda en el historial

  assert.equal((await api("post", "/auth/login").send({ correo: t.correo, password: PASSWORD })).status, 401);
  assert.notEqual((await api("get", "/usuarios/me").set(auth(t.token))).status, 200); // el token ya no sirve

  const otra = await api("post", "/auth/registro").send({ nombre: "Otra Persona", correo: t.correo, password: PASSWORD, rol: "turista", acepta_terminos: true });
  assert.equal(otra.status, 201);
});

test("al eliminar su cuenta un prestador deja de publicar y sus datos de contacto se borran", async () => {
  const { prest, p, sitio } = await negocioConServicio();
  const t = await registrar("turista");
  await api("post", "/reservas").set(auth(t.token)).send({ sitio_id: sitio.id, fecha_servicio: enDias(9) });

  const bloqueada = await api("delete", "/auth/cuenta").set(auth(prest.token)).send({ password: PASSWORD });
  assert.equal(bloqueada.status, 400); // tiene una solicitud pendiente
  assert.match(bloqueada.body.error, /reserva/);

  const [r] = (await api("get", "/reservas/recibidas").set(auth(prest.token))).body;
  await api("patch", `/reservas/${r.id}/rechazar`).set(auth(prest.token)).send({});
  assert.equal((await api("delete", "/auth/cuenta").set(auth(prest.token)).send({ password: PASSWORD })).status, 200);

  assert.equal((await api("get", `/sitios/${sitio.id}`)).status, 404); // archivado: ya no existe para el público
  const catalogo = await api("get", "/sitios?municipio=Florencia&texto=Servicio%20Cuenta&limit=50");
  assert.ok(!catalogo.body.resultados.some((s) => s.id === sitio.id));
  assert.equal((await api("get", `/prestadores/${p.id}/publico`)).status, 404);
  const negocio = await Prestador.findByPk(p.id);
  assert.equal(negocio.telefono, null);
  assert.equal(negocio.direccion, null);
});

test("los administradores no pueden eliminar su cuenta y las eliminadas no se listan", async () => {
  const admin = await registrar("turista");
  await Usuario.update({ rol: "administrador" }, { where: { id: admin.usuario.id } });
  const res = await api("delete", "/auth/cuenta").set(auth(admin.token)).send({ password: PASSWORD });
  assert.equal(res.status, 400);
  assert.match(res.body.error, /administrador/);

  const t = await registrar("turista");
  await api("delete", "/auth/cuenta").set(auth(t.token)).send({ password: PASSWORD });
  const lista = await api("get", "/admin/usuarios?texto=eliminad").set(auth(admin.token));
  assert.equal(lista.status, 200);
  assert.ok(!lista.body.some((u) => u.id === t.usuario.id));
  const estado = await api("patch", `/admin/usuarios/${t.usuario.id}/estado`).set(auth(admin.token)).send({ activo: true });
  assert.equal(estado.status, 400);
});
