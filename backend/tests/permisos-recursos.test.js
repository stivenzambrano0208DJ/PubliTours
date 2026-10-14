const test = require("node:test");
const assert = require("node:assert/strict");
const { sequelize, auth } = require("./helpers");
const { Conversacion, Mensaje, ReporteMensaje } = require("./../src/models");
const { Reserva, SitioTuristico, Paquete, Resena, Itinerario, Notificacion, Prestador } = require("./../src/models");
const { crearMundo, limpiarMundo, enDias, api } = require("./mundo");

test.after(async () => { limpiarMundo(); await sequelize.close(); });

// La matriz de permisos dice QUIÉN puede llamar a cada ruta; estas pruebas comprueban lo que esa matriz no puede ver: que una cuenta
// con el rol correcto no toque los recursos de OTRA cuenta (acceso cruzado, o "IDOR"). Para cada ataque se exige un error 4xx
// (nunca 2xx ni 500) Y que el recurso siga igual en la base de datos.
let m;
test.before(async () => { m = await crearMundo(); });

const es4xx = (res, nombre) => assert.ok(res.status >= 400 && res.status < 500, `${nombre}: respondió ${res.status}, se esperaba un error 4xx`);

test("un turista no puede ver ni modificar las reservas de otro turista", async () => {
  const B = m.turistaB.token;
  const id = m.reservaConfirmada.id;
  es4xx(await api("get", `/reservas/${id}`).set(auth(B)), "ver la reserva ajena");
  es4xx(await api("patch", `/reservas/${id}/cancelar`).set(auth(B)), "cancelar la reserva ajena");
  es4xx(await api("patch", `/reservas/${id}/editar`).set(auth(B)).send({ fecha_servicio: enDias(40), personas: 1 }), "editar la reserva ajena");
  es4xx(await api("post", `/reservas/${m.reservaCompletada.id}/resena`).set(auth(B)).send({ calificacion: 1, comentario: "Reseña falsa" }), "reseñar con la reserva ajena");

  const despues = await Reserva.findByPk(id);
  assert.equal(despues.estado, "confirmada");
  assert.equal(despues.personas, 2);
  assert.equal(await Resena.count({ where: { reserva_id: m.reservaCompletada.id } }), 1); // sigue siendo solo la de A
});

test("un negocio no puede confirmar, rechazar ni registrar la asistencia de reservas de otro negocio", async () => {
  const B = m.B.cuenta.token;
  const pendiente = m.reservaPendiente.id;
  es4xx(await api("patch", `/reservas/${pendiente}/confirmar`).set(auth(B)), "confirmar la reserva de otro negocio");
  es4xx(await api("patch", `/reservas/${pendiente}/rechazar`).set(auth(B)).send({ motivo: "No me gusta" }), "rechazar la reserva de otro negocio");
  es4xx(await api("patch", `/reservas/${m.reservaConfirmada.id}/asistencia`).set(auth(B)).send({ asistio: false }), "registrar asistencia ajena");
  es4xx(await api("get", `/reservas/${m.reservaConfirmada.id}`).set(auth(B)), "ver una reserva que no es de mi negocio");

  assert.equal((await Reserva.findByPk(pendiente)).estado, "pendiente");
  assert.equal((await Reserva.findByPk(m.reservaConfirmada.id)).estado, "confirmada");
});

test("un turista no puede ver, compartir ni revocar los itinerarios de otro", async () => {
  const B = m.turistaB.token;
  es4xx(await api("get", `/itinerarios/${m.itinerario.id}`).set(auth(B)), "ver el itinerario ajeno");
  es4xx(await api("post", `/itinerarios/${m.itinerario.id}/compartir`).set(auth(B)), "compartir el itinerario ajeno");
  es4xx(await api("delete", `/itinerarios/${m.itinerario.id}/compartir`).set(auth(B)), "revocar el enlace ajeno");
  assert.equal((await Itinerario.findByPk(m.itinerario.id)).token_publico, m.tokenCompartido); // ni cambió ni se borró
  assert.equal((await api("get", `/itinerarios/compartido/${m.tokenCompartido}`)).status, 200); // y el enlace de A sigue vivo
});

test("las notificaciones son privadas: nadie las marca como leídas ni las ve ajenas", async () => {
  const B = m.turistaB.token;
  assert.equal((await api("patch", `/notificaciones/${m.notificacion.id}/leido`).set(auth(B))).status, 403);
  assert.equal((await Notificacion.findByPk(m.notificacion.id)).leido, false);
  const lista = await api("get", "/notificaciones").set(auth(B));
  assert.ok(!JSON.stringify(lista.body).includes("Mensaje privado de A"));
});

test("un negocio no puede modificar, borrar ni administrar los servicios de otro", async () => {
  const B = m.B.cuenta.token;
  const sitio = m.A.sitios[0].id;
  const nombreOriginal = m.A.sitios[0].nombre;
  const intento = { nombre: "Servicio secuestrado", categoria: "Naturaleza", municipio: "Florencia", precio: 1 };
  assert.equal((await api("put", `/sitios/${sitio}`).set(auth(B)).send(intento)).status, 403);
  assert.equal((await api("delete", `/sitios/${sitio}`).set(auth(B))).status, 403);
  assert.equal((await api("post", `/sitios/${sitio}/fechas-bloqueadas`).set(auth(B)).send({ fecha: enDias(50) })).status, 403);
  es4xx(await api("post", `/sitios/${sitio}/imagenes`).set(auth(B)), "agregar fotos a un servicio ajeno");

  const despues = await SitioTuristico.findByPk(sitio);
  assert.equal(despues.nombre, nombreOriginal);
  assert.equal(despues.estado, "activo");
});

test("un negocio no puede modificar, borrar ni pausar los paquetes de otro", async () => {
  const B = m.B.cuenta.token;
  const id = m.A.paquete.id;
  es4xx(await api("put", `/paquetes/${id}`).set(auth(B)).send({ nombre: "Paquete secuestrado", descripcion: "x".repeat(30), precio: 1, sitios: m.B.sitios.map((s, i) => ({ sitio_id: s.id, dia: i + 1 })) }), "editar el paquete ajeno");
  es4xx(await api("patch", `/paquetes/${id}/estado`).set(auth(B)).send({ estado: "inactivo" }), "pausar el paquete ajeno");
  es4xx(await api("delete", `/paquetes/${id}`).set(auth(B)), "borrar el paquete ajeno");
  es4xx(await api("post", `/paquetes/${id}/imagenes`).set(auth(B)), "agregar fotos al paquete ajeno");

  const despues = await Paquete.findByPk(id);
  assert.equal(despues.nombre, m.A.paquete.nombre);
  assert.equal(despues.estado, "activo");
});

test("un negocio no puede editar ni enviar a revisión el perfil de otro negocio", async () => {
  const B = m.B.cuenta.token;
  const id = m.A.negocio.id;
  es4xx(await api("put", `/prestadores/${id}`).set(auth(B)).send({ nombre_negocio: "Negocio secuestrado", categoria: "Naturaleza", municipio: "Florencia" }), "editar el perfil ajeno");
  es4xx(await api("post", `/prestadores/${id}/enviar-revision`).set(auth(B)), "enviar a revisión el perfil ajeno");
  assert.equal((await Prestador.findByPk(id)).nombre_negocio, m.A.negocio.nombre_negocio);
});

test("un negocio no puede responder las reseñas de los servicios de otro", async () => {
  const B = m.B.cuenta.token;
  es4xx(await api("put", `/resenas/${m.resena.id}/respuesta`).set(auth(B)).send({ respuesta: "Respuesta falsa" }), "responder una reseña ajena");
  assert.equal((await Resena.findByPk(m.resena.id)).respuesta, null);
});

test("un turista no puede usar rutas de moderación ni de negocio, aunque conozca los ids", async () => {
  const T = m.turistaB.token;
  assert.equal((await api("patch", `/admin/sitios/${m.A.sitios[0].id}/estado`).set(auth(T)).send({ estado: "oculto", motivo: "x" })).status, 403);
  assert.equal((await api("delete", `/admin/resenas/${m.resena.id}`).set(auth(T))).status, 403);
  assert.equal((await api("patch", `/admin/usuarios/${m.turistaA.usuario.id}/estado`).set(auth(T)).send({ activo: false })).status, 403);
  assert.equal((await api("patch", `/prestadores/${m.A.negocio.id}/verificar`).set(auth(T)).send({ estado_verificacion: "rechazado", motivo: "x" })).status, 403);
  assert.equal(await Resena.count({ where: { id: m.resena.id } }), 1);
  assert.equal((await SitioTuristico.findByPk(m.A.sitios[0].id)).estado, "activo");
});

test("un administrador no puede suspender a otro administrador ni su propia cuenta", async () => {
  const res = await api("patch", `/admin/usuarios/${m.admin.usuario.id}/estado`).set(auth(m.admin.token)).send({ activo: false });
  assert.equal(res.status, 400);
});

test("las conversaciones y sus fotos son privadas: otra turista, otro negocio y la administración no entran, ni conociendo los ids", async () => {
  const id = m.conversacion.id;
  const imagenId = m.imagen.id;
  const antes = await Mensaje.count({ where: { conversacion_id: id } });
  const punteroAntes = (await Conversacion.findByPk(id)).prestador_leido_hasta;

  for (const [nombre, token] of [["otra turista", m.turistaB.token], ["otro negocio", m.B.cuenta.token]]) {
    es4xx(await api("get", `/conversaciones/${id}`).set(auth(token)), `${nombre}: ver la conversación ajena`);
    es4xx(await api("patch", `/conversaciones/${id}/leido`).set(auth(token)), `${nombre}: marcar como leída la conversación ajena`);
    es4xx(await api("post", `/conversaciones/${id}/mensajes`).set(auth(token)).send({ texto: "Me cuelo" }), `${nombre}: escribir en la conversación ajena`);
    es4xx(await api("get", `/conversaciones/imagenes/${imagenId}`).set(auth(token)), `${nombre}: ver la foto ajena`);
    es4xx(await api("post", `/conversaciones/mensajes/${m.mensajeConversacion.id}/reportar`).set(auth(token)).send({ motivo: "spam" }), `${nombre}: reportar un mensaje ajeno`);
    assert.ok(!JSON.stringify((await api("get", "/conversaciones").set(auth(token))).body).includes("Mensaje privado de la conversación de A"), `${nombre}: la lista no debe mostrar lo ajeno`);
  }
  assert.equal((await api("get", `/conversaciones/${id}`).set(auth(m.admin.token))).status, 403); // la administración no lee conversaciones
  assert.equal((await api("get", `/conversaciones/imagenes/${imagenId}`).set(auth(m.admin.token))).status, 404); // ni fotos que nadie reportó
  assert.equal((await api("get", `/conversaciones/imagenes/${imagenId}`)).status, 401);

  assert.equal(await Mensaje.count({ where: { conversacion_id: id } }), antes); // nadie coló nada
  assert.equal((await Conversacion.findByPk(id)).prestador_leido_hasta, punteroAntes); // ni movió el "leído"
  assert.equal(await ReporteMensaje.count({ where: { mensaje_id: m.mensajeConversacion.id } }), 0);
  // y las dos partes sí la ven
  assert.equal((await api("get", `/conversaciones/${id}`).set(auth(m.turistaA.token))).status, 200);
  assert.equal((await api("get", `/conversaciones/${id}`).set(auth(m.A.cuenta.token))).status, 200);
  assert.equal((await api("get", `/conversaciones/imagenes/${imagenId}`).set(auth(m.turistaA.token))).status, 200);
});
