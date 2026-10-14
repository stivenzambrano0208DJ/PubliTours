const test = require("node:test");
const assert = require("node:assert/strict");
const { request, app, sequelize, registrar, auth } = require("./helpers");
const { Prestador, Reserva } = require("../src/models");
const { cotizar } = require("../src/services/precioService");
const { enviarRecordatorios } = require("../src/services/reservas");

test.after(() => sequelize.close());

const api = (m, url) => request(app)[m](`/api/v1${url}`);
const enDias = (n) => new Date(Date.now() + n * 864e5).toLocaleDateString("en-CA");

async function negocio() {
  const prest = await registrar("prestador");
  const p = await Prestador.create({ usuario_id: prest.usuario.id, nombre_negocio: `Neg ${Date.now()}`, categoria: "Naturaleza", municipio: "Florencia", estado_verificacion: "aprobado" });
  const crear = async (extra = {}) => (await api("post", "/sitios").set(auth(prest.token)).send({
    nombre: `Servicio ${Date.now()}${Math.random()}`, categoria: "Naturaleza", municipio: "Florencia", precio: 100000, prestador_id: p.id, ...extra,
  }));
  return { prest, p, crear };
}

// ---------------- Precios flexibles ----------------
test("cotizar: niños, temporada y descuento por grupo", async () => {
  const sitio = {
    id: 0, precio: 100000, precio_nino: 60000, grupo_min_personas: 5, grupo_descuento_pct: 10,
    tarifas: [{ nombre: "Semana Santa", fecha_desde: "2030-04-01", fecha_hasta: "2030-04-10", precio: 150000, precio_nino: null }],
  };
  // 2 adultos + 1 niño, fuera de temporada: 2×100.000 + 60.000
  assert.equal((await cotizar(sitio, { fecha: "2030-03-01", personas: 3, ninos: 1 })).total, 260000);
  // en temporada sin precio de niño: el niño paga el precio de adulto de la temporada
  const t = await cotizar(sitio, { fecha: "2030-04-05", personas: 3, ninos: 1 });
  assert.equal(t.total, 450000);
  assert.equal(t.temporada, "Semana Santa");
  // 5 personas: 10 % de descuento por grupo
  const g = await cotizar(sitio, { fecha: "2030-03-01", personas: 5, ninos: 0 });
  assert.equal(g.subtotal, 500000);
  assert.equal(g.descuento, 50000);
  assert.equal(g.total, 450000);
  // debe haber al menos un adulto
  await assert.rejects(() => cotizar(sitio, { fecha: "2030-03-01", personas: 2, ninos: 2 }), /al menos un adulto/);
});

test("el prestador define tarifa de niños, descuento por grupo y temporadas; la reserva usa esos precios", async () => {
  const { prest, crear } = await negocio();
  const res = await crear({
    precio_nino: 60000, grupo_min_personas: 4, grupo_descuento_pct: 10,
    temporadas: [{ nombre: "Diciembre", fecha_desde: enDias(60), fecha_hasta: enDias(70), precio: 200000, precio_nino: 120000 }],
  });
  assert.equal(res.status, 201);
  const sitio = res.body;
  const detalle = await api("get", `/sitios/${sitio.id}`);
  assert.equal(Number(detalle.body.precio_nino), 60000);
  assert.equal(detalle.body.tarifas.length, 1);
  assert.equal(detalle.body.tarifas[0].nombre, "Diciembre");
  assert.equal((await api("get", `/sitios?texto=${encodeURIComponent(sitio.nombre)}`)).body.resultados.find((s) => s.id === sitio.id).tiene_temporadas, true);

  // cotización pública
  const c = await api("get", `/sitios/${sitio.id}/cotizar?fecha=${enDias(5)}&personas=3&ninos=1`);
  assert.equal(c.status, 200);
  assert.equal(c.body.total, 260000); // 2×100.000 + 60.000
  assert.equal((await api("get", `/sitios/${sitio.id}/cotizar?fecha=${enDias(5)}&personas=2&ninos=2`)).status, 400);

  // la reserva guarda el total calculado por el servidor (no uno enviado por el cliente)
  const turista = await registrar("turista");
  const r = await api("post", "/reservas").set(auth(turista.token)).send({ sitio_id: sitio.id, fecha_servicio: enDias(65), personas: 4, ninos: 2, total: 1 });
  assert.equal(r.status, 201);
  assert.equal(r.body.ninos, 2);
  // temporada: 2 adultos × 200.000 + 2 niños × 120.000 = 640.000, menos 10 % por grupo (4 personas) = 576.000
  assert.equal(Number(r.body.total), 576000);

  // validaciones del tarifario
  const malo = await api("post", "/sitios").set(auth(prest.token)).send({
    nombre: "X", categoria: "Y", municipio: "Z", grupo_min_personas: 5, // falta el porcentaje
  });
  assert.equal(malo.status, 400);
  const fechasMalas = await api("put", `/sitios/${sitio.id}`).set(auth(prest.token)).send({
    nombre: "X", categoria: "Y", municipio: "Z", temporadas: [{ nombre: "Rara", fecha_desde: "2030-05-10", fecha_hasta: "2030-05-01", precio: 1 }],
  });
  assert.equal(fechasMalas.status, 400);

  // editar reemplaza las temporadas; [] las quita
  const sinTemporadas = await api("put", `/sitios/${sitio.id}`).set(auth(prest.token)).send({ nombre: sitio.nombre, categoria: "Naturaleza", municipio: "Florencia", precio: 100000, temporadas: [] });
  assert.equal(sinTemporadas.status, 200);
  assert.equal((await api("get", `/sitios/${sitio.id}`)).body.tarifas.length, 0);
});

// ---------------- Disponibilidad ----------------
test("el calendario muestra libre, pocos cupos, completo y bloqueado", async () => {
  const { prest, p, crear } = await negocio();
  const sitio = (await crear({ capacidad: 8 })).body;
  const libre = enDias(40), pocos = enDias(41), completo = enDias(42), bloqueado = enDias(43);
  const mes = libre.slice(0, 7);

  const confirmar = async (fecha, personas) => {
    const t = await registrar("turista");
    const r = await api("post", "/reservas").set(auth(t.token)).send({ sitio_id: sitio.id, fecha_servicio: fecha, personas });
    await api("patch", `/reservas/${r.body.id}/confirmar`).set(auth(prest.token));
  };
  await confirmar(pocos, 6); // quedan 2 de 8 (25 %)
  await confirmar(completo, 8);
  await api("post", `/sitios/${sitio.id}/fechas-bloqueadas`).set(auth(prest.token)).send({ fecha: bloqueado, motivo: "Mantenimiento" });

  const cal = await api("get", `/sitios/${sitio.id}/disponibilidad?mes=${mes}`);
  assert.equal(cal.status, 200);
  assert.equal(cal.body.capacidad, 8);
  const dia = (f) => cal.body.dias.find((d) => d.fecha === f);
  if (dia(libre)) assert.equal(dia(libre).estado, "libre"); // los 4 días de la prueba pueden cruzar de mes
  if (dia(pocos)) { assert.equal(dia(pocos).estado, "pocos"); assert.equal(dia(pocos).cupos_libres, 2); }
  if (dia(completo)) assert.equal(dia(completo).estado, "completo");
  if (dia(bloqueado)) { assert.equal(dia(bloqueado).estado, "bloqueado"); assert.equal(dia(bloqueado).motivo, "Mantenimiento"); }
  assert.equal(cal.body.dias.find((d) => d.fecha <= enDias(0))?.estado ?? "pasado", "pasado");
  assert.equal((await api("get", "/sitios/999999/disponibilidad")).status, 404);
  assert.ok(p);
});

test("sin cupos definidos una reserva confirmada completa el día; el paquete tiene su propio calendario", async () => {
  const { prest, crear } = await negocio();
  const a = (await crear()).body;
  const b = (await crear()).body;
  const fecha = enDias(30);
  const mes = fecha.slice(0, 7);
  const t = await registrar("turista");
  const r = await api("post", "/reservas").set(auth(t.token)).send({ sitio_id: a.id, fecha_servicio: fecha });
  await api("patch", `/reservas/${r.body.id}/confirmar`).set(auth(prest.token));

  const calA = await api("get", `/sitios/${a.id}/disponibilidad?mes=${mes}`);
  assert.equal(calA.body.dias.find((d) => d.fecha === fecha).estado, "completo");

  const paquete = (await api("post", "/paquetes").set(auth(prest.token)).send({ nombre: "Paquete cal", precio: 1, sitios: [{ sitio_id: a.id }, { sitio_id: b.id }] })).body;
  await api("post", `/sitios/${b.id}/fechas-bloqueadas`).set(auth(prest.token)).send({ fecha: enDias(31) });
  const calP = await api("get", `/paquetes/${paquete.id}/disponibilidad?mes=${enDias(31).slice(0, 7)}`);
  assert.equal(calP.status, 200);
  assert.equal(calP.body.dias.find((d) => d.fecha === enDias(31)).estado, "bloqueado"); // un servicio bloqueado bloquea el paquete
  assert.equal(calP.body.dias.find((d) => d.fecha === fecha)?.estado ?? "libre", "libre"); // la reserva del servicio suelto no ocupa el paquete
});

// ---------------- Editar reserva ----------------
test("editar una reserva: cambia fecha, personas y total; una confirmada vuelve a pendiente", async () => {
  const { prest, crear } = await negocio();
  const sitio = (await crear({ precio: 50000 })).body;
  const turista = await registrar("turista");
  const otro = await registrar("turista");
  const r = (await api("post", "/reservas").set(auth(turista.token)).send({ sitio_id: sitio.id, fecha_servicio: enDias(10), personas: 2 })).body;
  await api("patch", `/reservas/${r.id}/confirmar`).set(auth(prest.token));

  const url = `/reservas/${r.id}/editar`;
  assert.equal((await api("patch", url).set(auth(otro.token)).send({ fecha_servicio: enDias(12), personas: 3 })).status, 400); // no es suya
  assert.equal((await api("patch", url).set(auth(turista.token)).send({ fecha_servicio: enDias(10), personas: 2 })).body.error, "No hay cambios que guardar.");
  assert.equal((await api("patch", url).set(auth(turista.token)).send({ fecha_servicio: "2020-01-01", personas: 2 })).status, 400); // fecha pasada

  const ok = await api("patch", url).set(auth(turista.token)).send({ fecha_servicio: enDias(12), personas: 3, nota: "Llegamos tarde" });
  assert.equal(ok.status, 200);
  assert.equal(ok.body.fecha_servicio, enDias(12));
  assert.equal(ok.body.personas, 3);
  assert.equal(Number(ok.body.total), 150000);
  assert.equal(ok.body.estado, "pendiente"); // estaba confirmada: necesita nueva confirmación
  assert.equal(ok.body.nota, "Llegamos tarde");

  const avisos = await api("get", "/notificaciones").set(auth(prest.token));
  assert.ok(avisos.body.some((n) => n.tipo === "reserva_modificada" && n.mensaje.includes("nueva confirmación")));

  // respeta los días bloqueados y no se pueden editar reservas canceladas
  await api("post", `/sitios/${sitio.id}/fechas-bloqueadas`).set(auth(prest.token)).send({ fecha: enDias(15) });
  assert.match((await api("patch", url).set(auth(turista.token)).send({ fecha_servicio: enDias(15), personas: 3 })).body.error, /no atiende ese día/);
  await api("patch", `/reservas/${r.id}/cancelar`).set(auth(turista.token));
  assert.equal((await api("patch", url).set(auth(turista.token)).send({ fecha_servicio: enDias(16), personas: 1 })).status, 400);
});

test("editar la reserva de un paquete recalcula con el precio del paquete", async () => {
  const { prest, crear } = await negocio();
  const a = (await crear()).body;
  const b = (await crear()).body;
  const paquete = (await api("post", "/paquetes").set(auth(prest.token)).send({ nombre: "Paq editar", precio: 70000, sitios: [{ sitio_id: a.id }, { sitio_id: b.id }] })).body;
  const turista = await registrar("turista");
  const r = (await api("post", "/reservas").set(auth(turista.token)).send({ paquete_id: paquete.id, fecha_servicio: enDias(20), personas: 2 })).body;
  const ok = await api("patch", `/reservas/${r.id}/editar`).set(auth(turista.token)).send({ fecha_servicio: enDias(21), personas: 4 });
  assert.equal(Number(ok.body.total), 280000);
  assert.equal(ok.body.estado, "pendiente");
});

// ---------------- Comprobante ----------------
test("cada reserva tiene un código de comprobante, verificable públicamente con datos mínimos", async () => {
  const { prest, crear } = await negocio();
  const sitio = (await crear()).body;
  const turista = await registrar("turista");
  const r = (await api("post", "/reservas").set(auth(turista.token)).send({ sitio_id: sitio.id, fecha_servicio: enDias(9), personas: 2 })).body;
  assert.match(r.codigo, /^PT-[A-Z2-9]{6}$/);
  const otra = (await api("post", "/reservas").set(auth(turista.token)).send({ sitio_id: sitio.id, fecha_servicio: enDias(11) })).body;
  assert.notEqual(otra.codigo, r.codigo);

  const publico = await api("get", `/reservas/verificar/${r.codigo.toLowerCase()}`); // sin sesión, sin importar mayúsculas
  assert.equal(publico.status, 200);
  assert.equal(publico.body.estado, "pendiente");
  assert.equal(publico.body.personas, 2);
  assert.equal(publico.body.servicio, sitio.nombre);
  assert.match(publico.body.titular, /^Usuario P\.$/); // "Usuario Prueba" -> solo nombre e inicial
  assert.equal(JSON.stringify(publico.body).includes("@"), false); // sin correo ni teléfono
  assert.equal((await api("get", "/reservas/verificar/PT-NOEXIST")).status, 404);

  // el detalle completo solo lo ven el turista, el prestador y el administrador
  const intruso = await registrar("turista");
  assert.equal((await api("get", `/reservas/${r.id}`).set(auth(intruso.token))).status, 404);
  assert.equal((await api("get", `/reservas/${r.id}`).set(auth(turista.token))).body.prestador.nombre_negocio.startsWith("Neg"), true);
  assert.equal((await api("get", `/reservas/${r.id}`).set(auth(prest.token))).status, 200);
  assert.equal((await api("get", `/reservas/${r.id}`)).status, 401);
});

// ---------------- Recordatorios ----------------
test("un día antes se envía el recordatorio, una sola vez y solo de reservas confirmadas", async () => {
  const { prest, crear } = await negocio();
  const sitio = (await crear()).body;
  const turista = await registrar("turista");
  const crearReserva = async (dias, confirmar) => {
    const r = (await api("post", "/reservas").set(auth(turista.token)).send({ sitio_id: sitio.id, fecha_servicio: enDias(dias) })).body;
    if (confirmar) await api("patch", `/reservas/${r.id}/confirmar`).set(auth(prest.token));
    return r;
  };
  const manana = await crearReserva(1, true);
  const pendiente = await crearReserva(1, false); // pendiente: no se recuerda
  const lejana = await crearReserva(5, true);

  const enviados = await enviarRecordatorios();
  assert.ok(enviados >= 1);
  assert.ok((await Reserva.findByPk(manana.id)).recordatorio_enviado_en);
  assert.equal((await Reserva.findByPk(pendiente.id)).recordatorio_enviado_en, null);
  assert.equal((await Reserva.findByPk(lejana.id)).recordatorio_enviado_en, null);

  const avisos = await api("get", "/notificaciones").set(auth(turista.token));
  const recordatorios = avisos.body.filter((n) => n.tipo === "reserva_recordatorio");
  assert.equal(recordatorios.length, 1);
  assert.ok(recordatorios[0].mensaje.includes(manana.codigo));

  await enviarRecordatorios(); // segunda corrida: no repite
  const despues = await api("get", "/notificaciones").set(auth(turista.token));
  assert.equal(despues.body.filter((n) => n.tipo === "reserva_recordatorio").length, 1);
});

test("dos ejecuciones simultáneas del recordatorio no duplican el aviso", async () => {
  const { prest, crear } = await negocio();
  const sitio = (await crear()).body;
  const turista = await registrar("turista");
  const r = (await api("post", "/reservas").set(auth(turista.token)).send({ sitio_id: sitio.id, fecha_servicio: enDias(1) })).body;
  await api("patch", `/reservas/${r.id}/confirmar`).set(auth(prest.token));

  await Promise.all([enviarRecordatorios(), enviarRecordatorios(), enviarRecordatorios()]);
  const avisos = await api("get", "/notificaciones").set(auth(turista.token));
  assert.equal(avisos.body.filter((n) => n.tipo === "reserva_recordatorio").length, 1);
});
