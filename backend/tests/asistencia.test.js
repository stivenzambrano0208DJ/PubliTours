const test = require("node:test");
const assert = require("node:assert/strict");
const { sequelize, registrar, auth, api, enDias } = require("./helpers");
const { Prestador, SitioTuristico, Reserva, Notificacion, Usuario } = require("../src/models");
const { cerrarReservasVencidas } = require("../src/services/reservas");
const { DIAS_GRACIA_ASISTENCIA } = require("../src/config/negocio");

test.after(() => sequelize.close());


async function negocio() {
  const prest = await registrar("prestador");
  const p = await Prestador.create({ usuario_id: prest.usuario.id, nombre_negocio: "Asistencia", categoria: "Naturaleza", municipio: "Florencia", estado_verificacion: "aprobado" });
  const sitio = await SitioTuristico.create({ nombre: "Servicio asistencia", categoria: "Naturaleza", municipio: "Florencia", precio: 20000, prestador_id: p.id });
  return { prest, p, sitio };
}

// Una reserva confirmada (con su comisión) cuya fecha de servicio es la indicada, relativa a hoy.
async function confirmada({ prest, p, sitio }, dias = 0, extra = {}) {
  const t = await registrar("turista");
  const reserva = await Reserva.create({
    turista_id: t.usuario.id, sitio_id: sitio.id, prestador_id: p.id, fecha_servicio: enDias(dias), estado: "confirmada",
    personas: 5, total: 100000, comision_pct: 10, comision: 10000, ...extra,
  });
  return { prest, t, reserva };
}
const asistencia = (prest, reserva, asistio) => api("patch", `/reservas/${reserva.id}/asistencia`).set(auth(prest.token)).send({ asistio });
const recargar = (id) => Reserva.findByPk(id);
const avisos = (usuario_id, tipo) => Notificacion.findAll({ where: { usuario_id, tipo } });

test("el plazo de gracia para registrar la asistencia es de 3 días", () => {
  assert.equal(DIAS_GRACIA_ASISTENCIA, 3);
});

test("el prestador registra que asistió: se completa, el turista recibe el aviso y ya puede calificar", async () => {
  const { prest, t, reserva } = await confirmada(await negocio(), -1);
  const res = await asistencia(prest, reserva, true);
  assert.equal(res.status, 200);
  assert.equal(res.body.estado, "completada");

  const guardada = await recargar(reserva.id);
  assert.equal(guardada.estado, "completada");
  assert.equal(guardada.cierre_automatico, false); // lo registró una persona, no el sistema
  assert.equal(Number(guardada.comision), 10000); // sigue generando comisión
  assert.equal((await avisos(t.usuario.id, "reserva_completada")).length, 1);

  const resena = await api("post", `/reservas/${reserva.id}/resena`).set(auth(t.token)).send({ calificacion: 5, comentario: "Excelente" });
  assert.equal(resena.status, 201);
});

test("el prestador registra que no asistió: no hay ingreso ni comisión ni reseña, y el turista lo sabe", async () => {
  const { prest, t, reserva } = await confirmada(await negocio(), -1);
  const res = await asistencia(prest, reserva, false);
  assert.equal(res.status, 200);
  assert.equal(res.body.estado, "no_asistio");

  const guardada = await recargar(reserva.id);
  assert.equal(guardada.comision, null);
  assert.equal(guardada.comision_pct, null);
  const [aviso] = await avisos(t.usuario.id, "reserva_no_asistio");
  assert.match(aviso.mensaje, /no asististe/);
  assert.match(aviso.mensaje, /comunícate con el negocio/);

  const resena = await api("post", `/reservas/${reserva.id}/resena`).set(auth(t.token)).send({ calificacion: 1, comentario: "Spam" });
  assert.equal(resena.status, 400);
  assert.match(resena.body.error, /completadas/);
});

test("se puede registrar el mismo día del servicio, pero no antes", async () => {
  const base = await negocio();
  const hoy = await confirmada(base, 0);
  assert.equal((await asistencia(hoy.prest, hoy.reserva, true)).status, 200);

  const manana = await confirmada(base, 1);
  const res = await asistencia(manana.prest, manana.reserva, true);
  assert.equal(res.status, 400);
  assert.match(res.body.error, /desde el día del servicio/);
  assert.equal((await recargar(manana.reserva.id)).estado, "confirmada");
});

test("el registro es definitivo y solo vale para reservas confirmadas", async () => {
  const base = await negocio();
  const { prest, reserva } = await confirmada(base, -1);
  assert.equal((await asistencia(prest, reserva, false)).status, 200);
  const otraVez = await asistencia(prest, reserva, true);
  assert.equal(otraVez.status, 400);
  assert.match(otraVez.body.error, /reserva confirmada/);
  assert.equal((await recargar(reserva.id)).estado, "no_asistio");

  for (const estado of ["pendiente", "rechazada", "cancelada"]) {
    const { reserva: r } = await confirmada(base, -1, { estado, comision_pct: null, comision: null });
    assert.equal((await asistencia(prest, r, true)).status, 400, estado);
    assert.equal((await recargar(r.id)).estado, estado);
  }
});

test("solo el prestador dueño registra la asistencia y el dato se valida", async () => {
  const { prest, reserva, t } = await confirmada(await negocio(), -1);
  const ajeno = await negocio();

  const intruso = await asistencia(ajeno.prest, reserva, true);
  assert.equal(intruso.status, 400);
  assert.match(intruso.body.error, /no pertenece a su negocio/);
  assert.equal((await api("patch", `/reservas/${reserva.id}/asistencia`).set(auth(t.token)).send({ asistio: true })).status, 403); // un turista no
  assert.equal((await api("patch", `/reservas/${reserva.id}/asistencia`).send({ asistio: true })).status, 401);
  assert.equal((await api("patch", `/reservas/${reserva.id}/asistencia`).set(auth(prest.token)).send({})).status, 400);
  assert.equal((await api("patch", `/reservas/${reserva.id}/asistencia`).set(auth(prest.token)).send({ asistio: "si" })).status, 400);
  assert.equal((await recargar(reserva.id)).estado, "confirmada");
  assert.equal((await api("patch", "/reservas/999999/asistencia").set(auth(prest.token)).send({ asistio: true })).status, 400);
});

test("pasado el plazo de gracia sin registro, la reserva se completa sola y queda marcada como cierre automático", async () => {
  const { t, reserva } = await confirmada(await negocio(), -DIAS_GRACIA_ASISTENCIA);
  await cerrarReservasVencidas();

  const guardada = await recargar(reserva.id);
  assert.equal(guardada.estado, "completada");
  assert.equal(guardada.cierre_automatico, true);
  assert.equal(Number(guardada.comision), 10000);
  assert.equal((await avisos(t.usuario.id, "reserva_completada")).length, 1);
  assert.equal((await api("post", `/reservas/${reserva.id}/resena`).set(auth(t.token)).send({ calificacion: 4 })).status, 201);
});

test("dentro del plazo no se cierra sola: se le recuerda al prestador una sola vez", async () => {
  const { prest, reserva } = await confirmada(await negocio(), -(DIAS_GRACIA_ASISTENCIA - 1));
  await cerrarReservasVencidas();
  await cerrarReservasVencidas(); // otra pasada de la tarea horaria

  const guardada = await recargar(reserva.id);
  assert.equal(guardada.estado, "confirmada");
  assert.ok(guardada.aviso_cierre_en);
  const recordatorios = await avisos(prest.usuario.id, "asistencia_pendiente");
  assert.equal(recordatorios.length, 1);
  assert.match(recordatorios[0].mensaje, /Registra si/);
  assert.match(recordatorios[0].mensaje, /se cerrará sola/);
});

test("el mismo día del servicio todavía no se cierra ni se recuerda", async () => {
  const { prest, reserva } = await confirmada(await negocio(), 0);
  await cerrarReservasVencidas();
  assert.equal((await recargar(reserva.id)).estado, "confirmada");
  assert.equal((await recargar(reserva.id)).aviso_cierre_en, null);
  assert.equal((await avisos(prest.usuario.id, "asistencia_pendiente")).length, 0);
});

test("lo ya registrado por el prestador no lo pisa el cierre automático", async () => {
  const { prest, reserva } = await confirmada(await negocio(), -DIAS_GRACIA_ASISTENCIA - 5);
  await asistencia(prest, reserva, false);
  await cerrarReservasVencidas();
  assert.equal((await recargar(reserva.id)).estado, "no_asistio");
});

test("si el prestador y el cierre automático coinciden, queda un solo resultado coherente", async () => {
  const { prest, t, reserva } = await confirmada(await negocio(), -DIAS_GRACIA_ASISTENCIA - 1);
  const [res] = await Promise.all([asistencia(prest, reserva, false), cerrarReservasVencidas()]);
  const estado = (await recargar(reserva.id)).estado;
  if (res.status === 200) assert.equal(estado, "no_asistio");
  else assert.equal(estado, "completada"); // el cierre automático llegó primero
  const completada = (await avisos(t.usuario.id, "reserva_completada")).length;
  const noAsistio = (await avisos(t.usuario.id, "reserva_no_asistio")).length;
  assert.equal(completada + noAsistio, 1); // un solo aviso al turista
});

test("al listar sus reservas el prestador dispara el cierre de las vencidas", async () => {
  const { prest, reserva } = await confirmada(await negocio(), -DIAS_GRACIA_ASISTENCIA - 2);
  await api("get", "/reservas/recibidas").set(auth(prest.token));
  assert.equal((await recargar(reserva.id)).estado, "completada");
});

test("las estadísticas separan lo que generó ingreso de lo que no asistió", async () => {
  const base = await negocio();
  const hechas = [-4, -5, -6].map((d) => confirmada(base, d, { fecha_servicio: enDias(d) }));
  const [a, b, c] = await Promise.all(hechas);
  await asistencia(base.prest, a.reserva, true);
  await asistencia(base.prest, b.reserva, true);
  await asistencia(base.prest, c.reserva, false);
  const t = await registrar("turista");
  await Reserva.create({ turista_id: t.usuario.id, sitio_id: base.sitio.id, prestador_id: base.p.id, fecha_servicio: enDias(-2), estado: "rechazada", personas: 1, total: 20000 });

  const { body } = await api("get", `/prestadores/me/estadisticas?desde=${enDias(-10)}&hasta=${enDias(0)}`).set(auth(base.prest.token));
  assert.equal(body.totales.por_estado.completada, 2);
  assert.equal(body.totales.por_estado.no_asistio, 1);
  assert.equal(body.totales.ingresos, 200000); // la que no asistió no suma
  assert.equal(body.totales.comision, 20000);
  assert.equal(body.totales.tasa_no_asistencia, 33); // 1 de 3 cerradas
  assert.equal(body.totales.tasa_aceptacion, 75); // 3 aceptadas (una no asistió) de 4 respondidas
});

test("sin reservas cerradas no se inventa una tasa de no asistencia", async () => {
  const { prest } = await negocio();
  const { body } = await api("get", `/prestadores/me/estadisticas?desde=${enDias(-10)}&hasta=${enDias(0)}`).set(auth(prest.token));
  assert.equal(body.totales.tasa_no_asistencia, null);
});

test("las tendencias de la plataforma no cuentan como valor aceptado lo que no asistió", async () => {
  const base = await negocio();
  const { prest, reserva } = await confirmada(base, -1);
  await asistencia(prest, reserva, false);

  const admin = await registrar("turista");
  await Usuario.update({ rol: "administrador" }, { where: { id: admin.usuario.id } });
  const mes = new Date().toLocaleDateString("en-CA").slice(0, 7);
  const antes = (await api("get", `/admin/tendencias?desde=${mes}-01&hasta=${enDias(0)}`).set(auth(admin.token))).body.totales.valor_aceptado;
  const t = await registrar("turista");
  await Reserva.create({ turista_id: t.usuario.id, sitio_id: base.sitio.id, prestador_id: base.p.id, fecha_servicio: enDias(-1), estado: "no_asistio", personas: 1, total: 777000 });
  const despues = (await api("get", `/admin/tendencias?desde=${mes}-01&hasta=${enDias(0)}`).set(auth(admin.token))).body.totales.valor_aceptado;
  assert.equal(despues, antes);
});

test("la configuración pública publica el plazo de gracia", async () => {
  assert.equal((await api("get", "/configuracion")).body.dias_gracia_asistencia, 3);
});
