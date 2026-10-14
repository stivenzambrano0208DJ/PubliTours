const test = require("node:test");
const assert = require("node:assert/strict");
const crypto = require("crypto");
const bcrypt = require("bcryptjs");
const { request, app, sequelize, registrar, auth } = require("./helpers");
const { Usuario, Prestador, PasswordReset } = require("../src/models");

const api = (m, url) => request(app)[m](`/api/v1${url}`);
const manana = () => new Date(Date.now() + 864e5).toISOString().slice(0, 10);
const sha = (t) => crypto.createHash("sha256").update(t).digest("hex");

test.after(() => sequelize.close());

test("registro y login; rechaza duplicados y datos inválidos", async () => {
  const { correo, res } = await registrar("turista");
  assert.equal(res.status, 201);
  assert.equal(res.body.usuario.rol, "turista");

  const dup = await api("post", "/auth/registro").send({ nombre: "Otro", correo, password: "clave12345", acepta_terminos: true });
  assert.equal(dup.status, 400);

  const malo = await api("post", "/auth/registro").send({ nombre: "A", correo: "x", password: "1" });
  assert.equal(malo.status, 400);
  assert.ok(Array.isArray(malo.body.detalles));

  const login = await api("post", "/auth/login").send({ correo, password: "clave12345" });
  assert.equal(login.status, 200);
  assert.equal((await api("post", "/auth/login").send({ correo, password: "incorrecta" })).status, 401);
});

test("nadie puede autoasignarse el rol administrador por registro", async () => {
  const { usuario } = await registrar("administrador");
  assert.equal(usuario.rol, "turista");
});

test("rutas protegidas: sin token 401 y rol incorrecto 403", async () => {
  assert.equal((await api("get", "/reservas/mias")).status, 401);
  const { token } = await registrar("turista");
  const res = await api("post", "/sitios").set(auth(token)).send({ nombre: "X", categoria: "Y", municipio: "Z" });
  assert.equal(res.status, 403);
  assert.equal((await api("get", "/estadisticas/resumen").set(auth(token))).status, 403);
});

test("flujo completo: verificación del prestador, publicación y reservas", async () => {
  const prest = await registrar("prestador");
  const turista = await registrar("turista");
  const admin = await Usuario.create({
    nombre: "Admin", correo: `adm${Date.now()}@test.com`, password_hash: await bcrypt.hash("clave12345", 10), rol: "administrador",
  });
  const adminToken = (await api("post", "/auth/login").send({ correo: admin.correo, password: "clave12345" })).body.token;

  const perfil = await api("post", "/prestadores").set(auth(prest.token))
    .send({ nombre_negocio: "Finca Test", categoria: "Hospedaje", municipio: "Florencia", telefono: "3001234567" });
  assert.equal(perfil.status, 201);
  assert.equal(perfil.body.estado_verificacion, "incompleto"); // primero completa su perfil

  // Mientras no lo envíe a revisión, el administrador no puede aprobarlo y el envío exige el perfil completo
  assert.equal((await api("patch", `/prestadores/${perfil.body.id}/verificar`).set(auth(adminToken)).send({ estado_verificacion: "aprobado" })).status, 400);
  const incompleto = await api("post", `/prestadores/${perfil.body.id}/enviar-revision`).set(auth(prest.token));
  assert.equal(incompleto.status, 400);
  assert.deepEqual(incompleto.body.faltan, ["una descripción de al menos 30 caracteres", "la dirección o cómo llegar"]);

  await api("put", `/prestadores/${perfil.body.id}`).set(auth(prest.token)).send({
    nombre_negocio: "Finca Test", categoria: "Hospedaje", municipio: "Florencia", telefono: "3001234567",
    descripcion: "Finca de hospedaje rodeada de naturaleza, con cabañas y senderos.", direccion: "Vereda El Caraño, km 4 vía a Morelia",
  });
  const enviado = await api("post", `/prestadores/${perfil.body.id}/enviar-revision`).set(auth(prest.token));
  assert.equal(enviado.status, 200);
  assert.equal(enviado.body.estado_verificacion, "pendiente");
  assert.equal((await api("post", `/prestadores/${perfil.body.id}/enviar-revision`).set(auth(prest.token))).status, 400); // ya enviado
  const avisos = await api("get", "/notificaciones").set(auth(adminToken));
  assert.ok(avisos.body.some((n) => n.tipo === "prestador_nuevo" && n.mensaje.includes("Finca Test")));

  // RN-01: sin aprobación no puede publicar
  const antes = await api("post", "/sitios").set(auth(prest.token))
    .send({ nombre: "Cabaña", categoria: "Hospedaje", municipio: "Florencia", precio: 80000, prestador_id: perfil.body.id });
  assert.equal(antes.status, 403);

  const aprob = await api("patch", `/prestadores/${perfil.body.id}/verificar`).set(auth(adminToken)).send({ estado_verificacion: "aprobado" });
  assert.equal(aprob.status, 200);

  const sitio = await api("post", "/sitios").set(auth(prest.token))
    .send({ nombre: "Cabaña", categoria: "Hospedaje", municipio: "Florencia", precio: "80000", prestador_id: perfil.body.id });
  assert.equal(sitio.status, 201);

  // RN-07: otro prestador no puede editarlo
  const otro = await registrar("prestador");
  const ajeno = await api("put", `/sitios/${sitio.body.id}`).set(auth(otro.token))
    .send({ nombre: "Hack", categoria: "X", municipio: "Y", precio: 1 });
  assert.equal(ajeno.status, 403);

  // El prestador no puede reservar su propio servicio
  const propia = await api("post", "/reservas").set(auth(prest.token)).send({ sitio_id: sitio.body.id, fecha_servicio: manana() });
  assert.equal(propia.status, 400);

  // Fecha inválida => 400; reserva válida nace pendiente (RN-04)
  assert.equal((await api("post", "/reservas").set(auth(turista.token)).send({ sitio_id: sitio.body.id, fecha_servicio: "mañana" })).status, 400);
  const r1 = await api("post", "/reservas").set(auth(turista.token)).send({ sitio_id: sitio.body.id, fecha_servicio: manana() });
  assert.equal(r1.status, 201);
  assert.equal(r1.body.estado, "pendiente");

  // RN-03: no se confirman dos reservas el mismo día para el mismo sitio
  const turista2 = await registrar("turista");
  const r2 = await api("post", "/reservas").set(auth(turista2.token)).send({ sitio_id: sitio.body.id, fecha_servicio: manana() });
  assert.equal((await api("patch", `/reservas/${r1.body.id}/confirmar`).set(auth(prest.token))).status, 200);
  assert.equal((await api("patch", `/reservas/${r2.body.id}/confirmar`).set(auth(prest.token))).status, 400);

  const notifs = await api("get", "/notificaciones").set(auth(turista.token));
  assert.ok(notifs.body.some((n) => n.tipo === "reserva_confirmada"));
});

test("el itinerario excluye los sitios del propio prestador", async () => {
  const prest = await registrar("prestador");
  const p = await Prestador.create({
    usuario_id: prest.usuario.id, nombre_negocio: "Mi negocio", categoria: "Naturaleza", municipio: "Morelia", estado_verificacion: "aprobado",
  });
  const propio = await api("post", "/sitios").set(auth(prest.token)).send({
    nombre: "Sitio propio", categoria: "Naturaleza", municipio: "Morelia", precio: 0, tipo_viaje: "naturaleza", prestador_id: p.id,
  });
  assert.equal(propio.status, 201);

  const res = await api("post", "/itinerarios").set(auth(prest.token)).send({ presupuesto: 500000, dias: 2, preferencias: "naturaleza" });
  const nombres = (res.body.items || []).map((i) => i.sitio.nombre);
  assert.ok(!nombres.includes("Sitio propio"));
});

test("recuperación: el código se bloquea tras 5 intentos fallidos", async () => {
  const { usuario, correo } = await registrar("turista");
  await PasswordReset.create({ usuario_id: usuario.id, token_hash: sha("123456"), expira: new Date(Date.now() + 600000) });

  for (let i = 0; i < 5; i++) {
    const mal = await api("post", "/auth/restablecer-password").send({ correo, codigo: "000000", password: "nuevaClave99" });
    assert.equal(mal.status, 400);
  }
  const bloqueado = await api("post", "/auth/restablecer-password").send({ correo, codigo: "123456", password: "nuevaClave99" });
  assert.equal(bloqueado.status, 400);
  assert.match(bloqueado.body.error, /Demasiados intentos/);
  assert.equal((await api("post", "/auth/login").send({ correo, password: "clave12345" })).status, 200);
});

test("recuperación: código correcto cambia la contraseña y no se reutiliza", async () => {
  const { usuario, correo } = await registrar("turista");
  await PasswordReset.create({ usuario_id: usuario.id, token_hash: sha("654321"), expira: new Date(Date.now() + 600000) });

  const ok = await api("post", "/auth/restablecer-password").send({ correo, codigo: "654321", password: "nuevaClave99" });
  assert.equal(ok.status, 200);
  assert.equal((await api("post", "/auth/login").send({ correo, password: "nuevaClave99" })).status, 200);
  const reuso = await api("post", "/auth/restablecer-password").send({ correo, codigo: "654321", password: "otraClave123" });
  assert.equal(reuso.status, 400);
});

// ---------- Funciones del turista ----------
async function prepararSitio() {
  const prest = await registrar("prestador");
  const p = await Prestador.create({
    usuario_id: prest.usuario.id, nombre_negocio: "Negocio", categoria: "Naturaleza", municipio: "Morelia", estado_verificacion: "aprobado",
  });
  const sitio = await api("post", "/sitios").set(auth(prest.token)).send({
    nombre: `Sitio ${Date.now()}`, categoria: "Naturaleza", municipio: "Morelia", precio: 0, prestador_id: p.id,
  });
  return { prest, prestador: p, sitio: sitio.body };
}

test("el turista cancela su reserva, libera la fecha y no puede cancelar la de otro", async () => {
  const { prest, sitio } = await prepararSitio();
  const turista = await registrar("turista");
  const otro = await registrar("turista");
  const r = await api("post", "/reservas").set(auth(turista.token)).send({ sitio_id: sitio.id, fecha_servicio: manana() });
  assert.equal((await api("patch", `/reservas/${r.body.id}/cancelar`).set(auth(otro.token))).status, 400);

  const ok = await api("patch", `/reservas/${r.body.id}/cancelar`).set(auth(turista.token));
  assert.equal(ok.status, 200);
  assert.equal(ok.body.estado, "cancelada");
  assert.equal((await api("patch", `/reservas/${r.body.id}/cancelar`).set(auth(turista.token))).status, 400);
  assert.equal((await api("patch", `/reservas/${r.body.id}/confirmar`).set(auth(prest.token))).status, 400);

  const notifs = await api("get", "/notificaciones").set(auth(prest.token));
  assert.ok(notifs.body.some((n) => n.tipo === "reserva_cancelada"));
});

test("reseñas: solo tras un servicio cumplido, una por reserva, y alimentan el promedio", async () => {
  const { prestador, sitio } = await prepararSitio();
  const turista = await registrar("turista");
  const { Reserva } = require("../src/models");

  const futura = await Reserva.create({ turista_id: turista.usuario.id, sitio_id: sitio.id, prestador_id: prestador.id, fecha_servicio: manana(), estado: "confirmada" });
  assert.equal((await api("post", `/reservas/${futura.id}/resena`).set(auth(turista.token)).send({ calificacion: 5 })).status, 400);

  const pasada = await Reserva.create({ turista_id: turista.usuario.id, sitio_id: sitio.id, prestador_id: prestador.id, fecha_servicio: "2020-01-01", estado: "completada" });
  assert.equal((await api("post", `/reservas/${pasada.id}/resena`).set(auth(turista.token)).send({ calificacion: 9 })).status, 400);
  const ok = await api("post", `/reservas/${pasada.id}/resena`).set(auth(turista.token)).send({ calificacion: 4, comentario: "Muy bonito" });
  assert.equal(ok.status, 201);
  assert.equal((await api("post", `/reservas/${pasada.id}/resena`).set(auth(turista.token)).send({ calificacion: 5 })).status, 400);

  const lista = await api("get", `/sitios/${sitio.id}/resenas`);
  assert.equal(lista.body.total, 1);
  assert.equal(lista.body.promedio, 4);
  const detalle = await api("get", `/sitios/${sitio.id}`);
  assert.equal(detalle.body.total_resenas, 1);
});

test("favoritos: agregar es idempotente, listar y quitar", async () => {
  const { sitio } = await prepararSitio();
  const turista = await registrar("turista");
  assert.equal((await api("get", "/favoritos")).status, 401);
  assert.equal((await api("post", `/favoritos/${sitio.id}`).set(auth(turista.token))).status, 201);
  assert.equal((await api("post", `/favoritos/${sitio.id}`).set(auth(turista.token))).status, 201);
  const lista = await api("get", "/favoritos").set(auth(turista.token));
  assert.equal(lista.body.length, 1);
  await api("delete", `/favoritos/${sitio.id}`).set(auth(turista.token));
  assert.equal((await api("get", "/favoritos").set(auth(turista.token))).body.length, 0);
  assert.equal((await api("post", "/favoritos/999999").set(auth(turista.token))).status, 404);
});

test("perfil: editar nombre/correo y cambiar contraseña exigiendo la actual", async () => {
  const { correo, token } = await registrar("turista");
  const otro = await registrar("turista");

  assert.equal((await api("put", "/auth/perfil").set(auth(token)).send({ nombre: "Nuevo Nombre", correo: otro.correo })).status, 400);
  const nuevoCorreo = `nuevo${Date.now()}@test.com`;
  const ok = await api("put", "/auth/perfil").set(auth(token)).send({ nombre: "Nuevo Nombre", correo: nuevoCorreo });
  assert.equal(ok.status, 200);
  assert.equal(ok.body.correo, nuevoCorreo);

  assert.equal((await api("put", "/auth/password").set(auth(token)).send({ actual: "incorrecta", nueva: "otraClave123" })).status, 400);
  assert.equal((await api("put", "/auth/password").set(auth(token)).send({ actual: "clave12345", nueva: "otraClave123" })).status, 200);
  assert.equal((await api("post", "/auth/login").send({ correo: nuevoCorreo, password: "otraClave123" })).status, 200);
  assert.ok(correo);
});

test("el turista lista sus itinerarios guardados", async () => {
  const { sitio } = await prepararSitio();
  const turista = await registrar("turista");
  await api("post", "/itinerarios").set(auth(turista.token)).send({ presupuesto: 300000, dias: 1 });
  const lista = await api("get", "/itinerarios").set(auth(turista.token));
  assert.equal(lista.status, 200);
  assert.equal(lista.body.length, 1);
  assert.ok(sitio.id);
});

// ---------- Funciones del prestador ----------
test("reserva con personas, nota y total; el cupo por día respeta la capacidad", async () => {
  const { prest, sitio } = await prepararSitio();
  await api("put", `/sitios/${sitio.id}`).set(auth(prest.token)).send({ ...sitio, precio: 50000, capacidad: 5 });
  const t1 = await registrar("turista");
  const t2 = await registrar("turista");

  const r1 = await api("post", "/reservas").set(auth(t1.token)).send({ sitio_id: sitio.id, fecha_servicio: manana(), personas: 3, nota: "Somos vegetarianos" });
  assert.equal(r1.status, 201);
  assert.equal(r1.body.personas, 3);
  assert.equal(Number(r1.body.total), 150000);
  assert.equal(r1.body.nota, "Somos vegetarianos");
  assert.equal((await api("post", "/reservas").set(auth(t1.token)).send({ sitio_id: sitio.id, fecha_servicio: manana(), personas: 9 })).status, 400);

  const r2 = await api("post", "/reservas").set(auth(t2.token)).send({ sitio_id: sitio.id, fecha_servicio: manana(), personas: 3 });
  assert.equal((await api("patch", `/reservas/${r1.body.id}/confirmar`).set(auth(prest.token))).status, 200);
  const sinCupo = await api("patch", `/reservas/${r2.body.id}/confirmar`).set(auth(prest.token));
  assert.equal(sinCupo.status, 400);
  assert.match(sinCupo.body.error, /cupos/);
});

test("fechas bloqueadas: el prestador las gestiona y no se puede reservar en ellas", async () => {
  const { prest, sitio } = await prepararSitio();
  const turista = await registrar("turista");
  const otro = await registrar("prestador");
  const fecha = manana();

  assert.equal((await api("post", `/sitios/${sitio.id}/fechas-bloqueadas`).set(auth(otro.token)).send({ fecha })).status, 403);
  const b = await api("post", `/sitios/${sitio.id}/fechas-bloqueadas`).set(auth(prest.token)).send({ fecha, motivo: "Mantenimiento" });
  assert.equal(b.status, 201);
  assert.equal((await api("get", `/sitios/${sitio.id}/fechas-bloqueadas`)).body.length, 1);

  const r = await api("post", "/reservas").set(auth(turista.token)).send({ sitio_id: sitio.id, fecha_servicio: fecha });
  assert.equal(r.status, 400);
  assert.match(r.body.error, /Mantenimiento/);

  await api("delete", `/sitios/${sitio.id}/fechas-bloqueadas/${b.body.id}`).set(auth(prest.token));
  assert.equal((await api("post", "/reservas").set(auth(turista.token)).send({ sitio_id: sitio.id, fecha_servicio: fecha })).status, 201);
});

test("rechazar con motivo: el turista lo recibe", async () => {
  const { prest, sitio } = await prepararSitio();
  const turista = await registrar("turista");
  const r = await api("post", "/reservas").set(auth(turista.token)).send({ sitio_id: sitio.id, fecha_servicio: manana() });
  const rech = await api("patch", `/reservas/${r.body.id}/rechazar`).set(auth(prest.token)).send({ motivo: "Cerrado por lluvias" });
  assert.equal(rech.body.motivo_rechazo, "Cerrado por lluvias");
  const notifs = await api("get", "/notificaciones").set(auth(turista.token));
  assert.ok(notifs.body.some((n) => n.mensaje.includes("Cerrado por lluvias")));
});

test("eliminar un servicio: se bloquea con reservas pendientes y luego se archiva", async () => {
  const { prest, sitio } = await prepararSitio();
  const turista = await registrar("turista");
  const r = await api("post", "/reservas").set(auth(turista.token)).send({ sitio_id: sitio.id, fecha_servicio: manana() });
  assert.equal((await api("delete", `/sitios/${sitio.id}`).set(auth(prest.token))).status, 400);

  await api("patch", `/reservas/${r.body.id}/rechazar`).set(auth(prest.token)).send({});
  assert.equal((await api("delete", `/sitios/${sitio.id}`).set(auth(prest.token))).status, 200);
  const mios = await api("get", "/prestadores/me/sitios").set(auth(prest.token));
  assert.ok(!mios.body.some((s) => s.id === sitio.id));
  const publico = await api("get", "/sitios");
  assert.ok(!publico.body.resultados.some((s) => s.id === sitio.id));
});

test("responder reseñas: solo el dueño del servicio; resumen por servicio", async () => {
  const { prest, prestador, sitio } = await prepararSitio();
  const otro = await registrar("prestador");
  const turista = await registrar("turista");
  const { Reserva } = require("../src/models");
  const pasada = await Reserva.create({ turista_id: turista.usuario.id, sitio_id: sitio.id, prestador_id: prestador.id, fecha_servicio: "2020-01-01", estado: "completada", personas: 2, total: 100000 });
  const res = await api("post", `/reservas/${pasada.id}/resena`).set(auth(turista.token)).send({ calificacion: 5, comentario: "Genial" });

  assert.equal((await api("put", `/resenas/${res.body.id}/respuesta`).set(auth(otro.token)).send({ respuesta: "Hola" })).status, 400);
  const ok = await api("put", `/resenas/${res.body.id}/respuesta`).set(auth(prest.token)).send({ respuesta: "¡Gracias por visitarnos!" });
  assert.equal(ok.status, 200);
  assert.equal(ok.body.respuesta, "¡Gracias por visitarnos!");

  const resumen = await api("get", "/prestadores/me/resumen").set(auth(prest.token));
  assert.equal(resumen.status, 200);
  assert.equal(resumen.body[sitio.id].confirmadas, 1);
  assert.equal(resumen.body[sitio.id].ingresos, 100000);
  assert.equal(resumen.body[sitio.id].promedio, 5);
  const recibidas = await api("get", "/prestadores/me/resenas").set(auth(prest.token));
  assert.equal(recibidas.body.length, 1);
});

// ---------- Funciones del administrador ----------
async function crearAdmin() {
  const admin = await Usuario.create({
    nombre: "Admin", correo: `adm${Date.now()}${Math.floor(Math.random() * 1000)}@test.com`, password_hash: await bcrypt.hash("clave12345", 10), rol: "administrador",
  });
  const token = (await api("post", "/auth/login").send({ correo: admin.correo, password: "clave12345" })).body.token;
  return { admin, token };
}

test("el administrador suspende y reactiva cuentas; la suspensión aplica de inmediato", async () => {
  const { token: adminToken } = await crearAdmin();
  const { admin: otroAdmin } = await crearAdmin();
  const turista = await registrar("turista");

  assert.equal((await api("get", "/admin/usuarios").set(auth(turista.token))).status, 403);
  const lista = await api("get", "/admin/usuarios").set(auth(adminToken));
  assert.ok(lista.body.some((u) => u.id === turista.usuario.id));
  assert.ok(!JSON.stringify(lista.body).includes("password_hash"));

  assert.equal((await api("patch", `/admin/usuarios/${otroAdmin.id}/estado`).set(auth(adminToken)).send({ activo: false })).status, 400);

  assert.equal((await api("patch", `/admin/usuarios/${turista.usuario.id}/estado`).set(auth(adminToken)).send({ activo: false })).status, 200);
  assert.equal((await api("get", "/reservas/mias").set(auth(turista.token))).status, 403); // token vigente, cuenta suspendida
  assert.equal((await api("post", "/auth/login").send({ correo: turista.correo, password: "clave12345" })).status, 403);

  await api("patch", `/admin/usuarios/${turista.usuario.id}/estado`).set(auth(adminToken)).send({ activo: true });
  assert.equal((await api("get", "/reservas/mias").set(auth(turista.token))).status, 200);
});

test("rechazar un prestador con motivo; al corregir y reenviar el perfil vuelve a pendiente", async () => {
  const { token: adminToken } = await crearAdmin();
  const prest = await registrar("prestador");
  const completo = { nombre_negocio: "Negocio X", categoria: "Hospedaje", municipio: "Florencia", telefono: "3001234567", descripcion: "Un negocio de hospedaje con muchas comodidades y atención.", direccion: "Calle 5 # 3-20, Florencia" };
  const perfil = await api("post", "/prestadores").set(auth(prest.token)).send(completo);
  await api("post", `/prestadores/${perfil.body.id}/enviar-revision`).set(auth(prest.token));

  const rech = await api("patch", `/prestadores/${perfil.body.id}/verificar`).set(auth(adminToken)).send({ estado_verificacion: "rechazado", motivo: "Falta descripción" });
  assert.equal(rech.body.motivo_rechazo, "Falta descripción");
  const notifs = await api("get", "/notificaciones").set(auth(prest.token));
  assert.ok(notifs.body.some((n) => n.tipo === "prestador_rechazado" && n.mensaje.includes("Falta descripción")));
  assert.equal((await api("patch", `/prestadores/${perfil.body.id}/verificar`).set(auth(adminToken)).send({ estado_verificacion: "otro" })).status, 400);

  // corregir no lo reenvía solo: sigue rechazado (con su motivo) hasta que el prestador lo envíe de nuevo
  const corregido = await api("put", `/prestadores/${perfil.body.id}`).set(auth(prest.token)).send({ ...completo, descripcion: "Descripción ampliada con todos los servicios que ofrece el negocio." });
  assert.equal(corregido.body.estado_verificacion, "rechazado");
  assert.equal(corregido.body.motivo_rechazo, "Falta descripción");

  const reenviado = await api("post", `/prestadores/${perfil.body.id}/enviar-revision`).set(auth(prest.token));
  assert.equal(reenviado.status, 200);
  assert.equal(reenviado.body.estado_verificacion, "pendiente");
  assert.equal(reenviado.body.motivo_rechazo, null);
});

test("moderación: ocultar servicios y retirar reseñas, con aviso a los afectados", async () => {
  const { token: adminToken } = await crearAdmin();
  const { prest, prestador, sitio } = await prepararSitio();
  const turista = await registrar("turista");
  const { Reserva } = require("../src/models");

  const ocultar = await api("patch", `/admin/sitios/${sitio.id}/estado`).set(auth(adminToken)).send({ estado: "oculto", motivo: "Contenido engañoso" });
  assert.equal(ocultar.status, 200);
  // el prestador no puede reactivar un servicio oculto por el administrador
  await api("put", `/sitios/${sitio.id}`).set(auth(prest.token)).send({ ...sitio, estado: "activo" });
  assert.equal((await api("get", `/sitios/${sitio.id}`)).status, 404); // oculto por moderación: ya no existe para el público
  assert.ok(!(await api("get", "/sitios")).body.resultados.some((s) => s.id === sitio.id));
  const avisos = await api("get", "/notificaciones").set(auth(prest.token));
  assert.ok(avisos.body.some((n) => n.tipo === "sitio_oculto" && n.mensaje.includes("Contenido engañoso")));
  await api("patch", `/admin/sitios/${sitio.id}/estado`).set(auth(adminToken)).send({ estado: "activo" });

  const pasada = await Reserva.create({ turista_id: turista.usuario.id, sitio_id: sitio.id, prestador_id: prestador.id, fecha_servicio: "2020-01-01", estado: "completada" });
  const res = await api("post", `/reservas/${pasada.id}/resena`).set(auth(turista.token)).send({ calificacion: 1, comentario: "Spam" });
  assert.equal((await api("delete", `/admin/resenas/${res.body.id}`).set(auth(turista.token))).status, 403);
  assert.equal((await api("delete", `/admin/resenas/${res.body.id}`).set(auth(adminToken))).status, 200);
  assert.equal((await api("get", `/sitios/${sitio.id}/resenas`)).body.total, 0);
  const aviso = await api("get", "/notificaciones").set(auth(turista.token));
  assert.ok(aviso.body.some((n) => n.tipo === "resena_retirada"));
});

// ---------- Reservas completadas y búsqueda por ubicación ----------
test("las reservas confirmadas con fecha pasada pasan a completada, avisan al turista y permiten reseñar", async () => {
  const { prest, prestador, sitio } = await prepararSitio();
  const turista = await registrar("turista");
  const { Reserva } = require("../src/models");
  const vencida = await Reserva.create({ turista_id: turista.usuario.id, sitio_id: sitio.id, prestador_id: prestador.id, fecha_servicio: "2020-02-02", estado: "confirmada" });
  const futura = await Reserva.create({ turista_id: turista.usuario.id, sitio_id: sitio.id, prestador_id: prestador.id, fecha_servicio: manana(), estado: "confirmada" });

  const mias = await api("get", "/reservas/mias").set(auth(turista.token));
  assert.equal(mias.body.find((r) => r.id === vencida.id).estado, "completada");
  assert.equal(mias.body.find((r) => r.id === futura.id).estado, "confirmada");

  const notifs = await api("get", "/notificaciones").set(auth(turista.token));
  assert.ok(notifs.body.some((n) => n.tipo === "reserva_completada"));
  assert.equal((await api("post", `/reservas/${vencida.id}/resena`).set(auth(turista.token)).send({ calificacion: 5 })).status, 201);
  assert.equal((await api("patch", `/reservas/${vencida.id}/cancelar`).set(auth(turista.token))).status, 400);
  assert.ok(prest);
});

test("ordenar por cercanía devuelve distancia en km y deja al final los sitios sin coordenadas", async () => {
  const { prest, prestador } = await prepararSitio();
  const crear = (nombre, latitud, longitud) => api("post", "/sitios").set(auth(prest.token))
    .send({ nombre, categoria: "Naturaleza", municipio: "Florencia", precio: 0, prestador_id: prestador.id, latitud, longitud });
  await crear("Lejano Cercania", 2.9, -75.2);
  await crear("Cercano Cercania", 1.62, -75.6);
  await crear("Sin coordenadas Cercania", "", "");

  const res = await api("get", "/sitios?texto=Cercania&orden=cercania&lat=1.6144&lng=-75.6062");
  assert.equal(res.status, 200);
  const nombres = res.body.resultados.map((s) => s.nombre);
  assert.deepEqual(nombres, ["Cercano Cercania", "Lejano Cercania", "Sin coordenadas Cercania"]);
  assert.ok(res.body.resultados[0].distancia_km < 5);
  assert.equal(res.body.resultados[2].distancia_km, null);
});

// ---------- Registro de prestador con datos del negocio ----------
test("registro de prestador con lo básico del negocio: crea cuenta y perfil incompleto en un solo paso", async () => {
  const correo = `negocio${Date.now()}@test.com`;
  const res = await api("post", "/auth/registro").send({
    nombre: "Ana Prestadora", correo, password: "clave12345", acepta_terminos: true, rol: "prestador",
    negocio: { nombre_negocio: "Finca Los Andaquies", categoria: "Hospedaje", municipio: "Belen de los Andaquies" },
  });
  assert.equal(res.status, 201);
  assert.equal(res.body.usuario.rol, "prestador");
  assert.equal(res.body.prestador.estado_verificacion, "incompleto"); // aún no está en revisión: primero completa su perfil

  const perfil = await api("get", "/prestadores/me").set(auth(res.body.token));
  assert.equal(perfil.status, 200);
  assert.equal(perfil.body.nombre_negocio, "Finca Los Andaquies");
  assert.equal(perfil.body.telefono, null);
  // no aparece en la cola de revisión del administrador hasta que lo envíe
  const { token: adminToken } = await crearAdmin();
  const pendientes = await api("get", "/prestadores/pendientes").set(auth(adminToken));
  assert.ok(!pendientes.body.some((p) => p.id === perfil.body.id));
  // aún no puede publicar hasta que lo apruebe un administrador
  const sitio = await api("post", "/sitios").set(auth(res.body.token)).send({ nombre: "X", categoria: "Y", municipio: "Z", prestador_id: perfil.body.id });
  assert.equal(sitio.status, 403);
});

test("registro de prestador: negocio inválido se rechaza y no crea la cuenta", async () => {
  const correo = `invalido${Date.now()}@test.com`;
  const sinCategoria = await api("post", "/auth/registro").send({
    nombre: "Ana", correo, password: "clave12345", acepta_terminos: true, rol: "prestador", negocio: { nombre_negocio: "Mi finca", municipio: "Florencia" },
  });
  assert.equal(sinCategoria.status, 400);
  assert.ok(sinCategoria.body.detalles.some((d) => d.campo.includes("categoria")));

  const sinNombre = await api("post", "/auth/registro").send({
    nombre: "Ana", correo, password: "clave12345", acepta_terminos: true, rol: "prestador",
    negocio: { nombre_negocio: "", categoria: "Hospedaje", municipio: "Florencia" },
  });
  assert.equal(sinNombre.status, 400);
  assert.equal((await api("post", "/auth/login").send({ correo, password: "clave12345" })).status, 401); // la cuenta no quedó creada
});

test("el turista no puede crearse un negocio por registro, y un correo repetido no deja perfil huérfano", async () => {
  const correo = `turista${Date.now()}@test.com`;
  const t = await api("post", "/auth/registro").send({
    nombre: "Turista", correo, password: "clave12345", acepta_terminos: true, rol: "turista",
    negocio: { nombre_negocio: "No deberia", categoria: "Hospedaje", municipio: "Florencia" },
  });
  assert.equal(t.status, 201);
  assert.equal(t.body.usuario.rol, "turista");
  assert.equal(t.body.prestador, undefined);

  const { Prestador: P } = require("../src/models");
  const antes = await P.count();
  const repetido = await api("post", "/auth/registro").send({
    nombre: "Otra", correo, password: "clave12345", acepta_terminos: true, rol: "prestador",
    negocio: { nombre_negocio: "Duplicado", categoria: "Hospedaje", municipio: "Florencia" },
  });
  assert.equal(repetido.status, 400);
  assert.equal(await P.count(), antes);
});
