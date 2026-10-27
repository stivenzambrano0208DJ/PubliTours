const test = require("node:test");
const assert = require("node:assert/strict");
const { sequelize, registrar, auth, api } = require("./helpers");
const { Prestador, SitioTuristico, Usuario } = require("../src/models");
const politicas = require("../src/politicas");

test.after(() => sequelize.close());

const SITIO = (extra = {}) => ({ nombre: "Servicio de política", categoria: "Naturaleza", municipio: "Florencia", precio: 10000, ...extra });
async function prestadorCon(estado) {
  const cuenta = await registrar("prestador");
  const negocio = await Prestador.create({ usuario_id: cuenta.usuario.id, nombre_negocio: `Negocio ${estado}`, categoria: "Naturaleza", municipio: "Florencia", estado_verificacion: estado });
  return { cuenta, negocio };
}

// ---------------- Hueco que encontró la revisión de políticas ----------------
test("RN-01: un negocio sin aprobar no puede publicar en el catálogo, ni dejando fuera su prestador_id", async () => {
  for (const estado of ["incompleto", "pendiente", "rechazado"]) {
    const { cuenta } = await prestadorCon(estado);
    const sinCampo = await api("post", "/sitios").set(auth(cuenta.token)).send(SITIO({ nombre: `Colado ${estado}` }));
    assert.ok(sinCampo.status >= 400 && sinCampo.status < 500, `(${estado}) sin prestador_id respondió ${sinCampo.status}`);
    assert.equal(await SitioTuristico.count({ where: { nombre: `Colado ${estado}` } }), 0, `(${estado}) se publicó un servicio sin verificación`);
  }
});

test("un prestador sin perfil de negocio no puede publicar servicios", async () => {
  const cuenta = await registrar("prestador"); // se registró sin datos del negocio: aún no tiene perfil
  const res = await api("post", "/sitios").set(auth(cuenta.token)).send(SITIO({ nombre: "Sin negocio" }));
  assert.ok(res.status >= 400 && res.status < 500, `respondió ${res.status}`);
  assert.equal(await SitioTuristico.count({ where: { nombre: "Sin negocio" } }), 0);
});

test("un negocio aprobado publica a su nombre: el servicio queda ligado a su negocio aunque no mande prestador_id", async () => {
  const { cuenta, negocio } = await prestadorCon("aprobado");
  const res = await api("post", "/sitios").set(auth(cuenta.token)).send(SITIO({ nombre: "Ligado al negocio" }));
  assert.equal(res.status, 201);
  assert.equal(res.body.prestador_id, negocio.id);
  const conId = await api("post", "/sitios").set(auth(cuenta.token)).send(SITIO({ nombre: "Con su id", prestador_id: negocio.id }));
  assert.equal(conId.status, 201);
});

test("un negocio no puede publicar a nombre de otro negocio", async () => {
  const a = await prestadorCon("aprobado");
  const b = await prestadorCon("aprobado");
  const res = await api("post", "/sitios").set(auth(a.cuenta.token)).send(SITIO({ nombre: "A nombre de otro", prestador_id: b.negocio.id }));
  assert.equal(res.status, 403);
  assert.equal(await SitioTuristico.count({ where: { nombre: "A nombre de otro" } }), 0);
});

// ---------------- Regla de producto: solo el prestador gestiona su catálogo ----------------
test("el administrador modera pero no gestiona el catálogo: no crea, edita, borra ni sube fotos de servicios", async () => {
  const { cuenta, negocio } = await prestadorCon("aprobado");
  const sitio = (await api("post", "/sitios").set(auth(cuenta.token)).send(SITIO({ nombre: "Del negocio" }))).body;
  const admin = await registrar("turista");
  await Usuario.update({ rol: "administrador" }, { where: { id: admin.usuario.id } });

  assert.equal((await api("post", "/sitios").set(auth(admin.token)).send(SITIO({ prestador_id: negocio.id }))).status, 403);
  assert.equal((await api("put", `/sitios/${sitio.id}`).set(auth(admin.token)).send(SITIO({ nombre: "Editado por admin" }))).status, 403);
  assert.equal((await api("delete", `/sitios/${sitio.id}`).set(auth(admin.token))).status, 403);
  assert.equal((await api("post", `/sitios/${sitio.id}/imagenes`).set(auth(admin.token))).status, 403);
  assert.equal((await api("post", `/sitios/${sitio.id}/fechas-bloqueadas`).set(auth(admin.token)).send({ fecha: "2031-05-05" })).status, 403);

  const intacto = await SitioTuristico.findByPk(sitio.id);
  assert.equal(intacto.nombre, "Del negocio");
  assert.equal(intacto.estado, "activo");

  // lo que sí le corresponde: ocultar y volver a publicar, con motivo
  const ocultar = await api("patch", `/admin/sitios/${sitio.id}/estado`).set(auth(admin.token)).send({ estado: "oculto", motivo: "Revisión" });
  assert.equal(ocultar.status, 200);
  assert.equal((await SitioTuristico.findByPk(sitio.id)).estado, "oculto");
});

test("un servicio ocultado por moderación no lo reactiva su prestador editándolo", async () => {
  const { cuenta } = await prestadorCon("aprobado");
  const sitio = (await api("post", "/sitios").set(auth(cuenta.token)).send(SITIO({ nombre: "Se oculta" }))).body;
  const admin = await registrar("turista");
  await Usuario.update({ rol: "administrador" }, { where: { id: admin.usuario.id } });
  await api("patch", `/admin/sitios/${sitio.id}/estado`).set(auth(admin.token)).send({ estado: "oculto", motivo: "x" });

  const editar = await api("put", `/sitios/${sitio.id}`).set(auth(cuenta.token)).send(SITIO({ nombre: "Se oculta", estado: "activo" }));
  assert.equal(editar.status, 200);
  assert.equal((await SitioTuristico.findByPk(sitio.id)).estado, "oculto");
});

// ---------------- Las políticas, una por una (son funciones puras) ----------------
const turista = { id: 1, rol: "turista" };
const prestador = { id: 2, rol: "prestador" };
const otroPrestador = { id: 3, rol: "prestador" };
const admin = { id: 9, rol: "administrador" };
const negocioDe2 = { id: 20, usuario_id: 2 };

test("política de servicios: solo el prestador dueño del negocio los edita (el administrador no)", () => {
  const { puedeEditarServicio, puedePublicarComo, servicioEsDelNegocio, puedeEditarPaquete } = politicas.catalogo;
  assert.equal(puedeEditarServicio(prestador, negocioDe2), true);
  assert.equal(puedeEditarServicio(otroPrestador, negocioDe2), false);
  assert.equal(puedeEditarServicio(admin, negocioDe2), false);
  // aunque tuviera el mismo id que el dueño, ser administrador no le da la gestión del catálogo: lo decide el rol, no solo la propiedad
  assert.equal(puedeEditarServicio({ id: 2, rol: "administrador" }, negocioDe2), false);
  assert.equal(puedePublicarComo({ id: 2, rol: "administrador" }, negocioDe2), false);
  assert.equal(puedeEditarServicio({ id: 2, rol: "turista" }, negocioDe2), false);
  assert.equal(puedeEditarServicio(turista, negocioDe2), false);
  assert.equal(puedeEditarServicio(prestador, null), false); // servicio sin negocio: nadie lo edita
  assert.equal(puedePublicarComo(prestador, negocioDe2), true);
  assert.equal(puedePublicarComo(otroPrestador, negocioDe2), false);
  assert.equal(servicioEsDelNegocio({ prestador_id: 20 }, negocioDe2), true);
  assert.equal(servicioEsDelNegocio({ prestador_id: 21 }, negocioDe2), false);
  assert.equal(servicioEsDelNegocio({ prestador_id: null }, negocioDe2), false);
  assert.equal(puedeEditarPaquete(negocioDe2, { prestador_id: 20 }), true);
  assert.equal(puedeEditarPaquete(negocioDe2, { prestador_id: 21 }), false);
  assert.equal(puedeEditarPaquete(null, { prestador_id: 20 }), false);
});

test("política de reservas: quién la ve, quién la gestiona y quién la cancela", () => {
  const { puedeVerReserva, puedeGestionarReserva, esTuristaDeLaReserva, esAutoReserva } = politicas.reservas;
  const reserva = { turista_id: 1, prestador: { usuario_id: 2 } };
  assert.equal(puedeVerReserva(turista, reserva), true); // la turista dueña
  assert.equal(puedeVerReserva(prestador, reserva), true); // el negocio dueño
  assert.equal(puedeVerReserva(admin, reserva), true);
  assert.equal(puedeVerReserva({ id: 5, rol: "turista" }, reserva), false);
  assert.equal(puedeVerReserva(otroPrestador, reserva), false);
  assert.equal(puedeGestionarReserva(2, negocioDe2), true);
  assert.equal(puedeGestionarReserva(3, negocioDe2), false);
  assert.equal(puedeGestionarReserva(2, null), false);
  assert.equal(esTuristaDeLaReserva(1, { turista_id: 1 }), true);
  assert.equal(esTuristaDeLaReserva(2, { turista_id: 1 }), false);
  assert.equal(esAutoReserva(2, negocioDe2), true);
  assert.equal(esAutoReserva(1, negocioDe2), false);
});

test("política de itinerarios, notificaciones, perfiles, reseñas y cuentas", () => {
  assert.equal(politicas.itinerarios.puedeVerItinerario(turista, { turista_id: 1 }), true);
  assert.equal(politicas.itinerarios.puedeVerItinerario(admin, { turista_id: 1 }), true);
  assert.equal(politicas.itinerarios.puedeVerItinerario({ id: 7, rol: "turista" }, { turista_id: 1 }), false);
  assert.equal(politicas.itinerarios.puedeCompartirItinerario(1, { turista_id: 1 }), true);
  assert.equal(politicas.itinerarios.puedeCompartirItinerario(9, { turista_id: 1 }), false); // ni el administrador comparte lo de otra persona
  assert.equal(politicas.notificaciones.puedeModificarNotificacion(1, { usuario_id: 1 }), true);
  assert.equal(politicas.notificaciones.puedeModificarNotificacion(2, { usuario_id: 1 }), false);
  assert.equal(politicas.negocios.puedeEditarPerfil(prestador, negocioDe2), true);
  assert.equal(politicas.negocios.puedeEditarPerfil(otroPrestador, negocioDe2), false);
  assert.equal(politicas.negocios.puedeResponderResena(2, negocioDe2), true);
  assert.equal(politicas.negocios.puedeResponderResena(3, negocioDe2), false);
  assert.equal(politicas.negocios.puedeResponderResena(2, null), false);
  assert.equal(politicas.cuentas.puedeEliminarCuenta(turista), true);
  assert.equal(politicas.cuentas.puedeEliminarCuenta(admin), false);
  assert.equal(politicas.cuentas.puedeSuspenderCuenta({ rol: "turista" }), true);
  assert.equal(politicas.cuentas.puedeSuspenderCuenta({ rol: "administrador" }), false);
});

test("al negar, cada política lanza el mismo error (estado y mensaje) que ya usaba la API", () => {
  const capturar = (fn) => { try { fn(); } catch (e) { return { estado: e.status, mensaje: e.message }; } return null; };
  assert.deepEqual(capturar(() => politicas.catalogo.exigirEditarServicio(otroPrestador, negocioDe2)), { estado: 403, mensaje: "No puede modificar un sitio que no pertenece a su negocio." });
  assert.deepEqual(capturar(() => politicas.catalogo.exigirEditarPaquete(negocioDe2, { prestador_id: 99 })), { estado: 400, mensaje: "No puedes modificar un paquete que no es de tu negocio." });
  assert.deepEqual(capturar(() => politicas.reservas.exigirGestionarReserva(3, negocioDe2)), { estado: 400, mensaje: "No puede gestionar una reserva que no pertenece a su negocio." });
  assert.deepEqual(capturar(() => politicas.reservas.exigirTuristaDeLaReserva(2, { turista_id: 1 })), { estado: 400, mensaje: "Reserva no encontrada." });
  assert.deepEqual(capturar(() => politicas.itinerarios.exigirVerItinerario({ id: 7, rol: "turista" }, { turista_id: 1 })), { estado: 403, mensaje: "No puede consultar el itinerario de otro usuario." });
  assert.equal(capturar(() => politicas.catalogo.exigirEditarServicio(prestador, negocioDe2)), null); // si se permite, no lanza nada
});
