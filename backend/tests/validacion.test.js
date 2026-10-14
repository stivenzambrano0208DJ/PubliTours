const test = require("node:test");
const assert = require("node:assert/strict");
const { request, app, sequelize, registrar, auth } = require("./helpers");
const { Prestador, SitioTuristico, Usuario } = require("../src/models");
const { esFechaReal, mesValidoOActual, fechaRelativa, hoyLocal, fechaDelDia } = require("../src/utils/fechas");

test.after(() => sequelize.close());

const api = (m, url) => request(app)[m](`/api/v1${url}`);
const IDS_MALOS = ["abc", "1.5", "0", "-1", "99999999999999999999", "1e3", "%20", "1;DROP"];

test("esFechaReal acepta solo fechas que existen en el calendario", () => {
  for (const ok of ["2031-03-12", "2028-02-29", "2000-02-29", "2031-12-31"]) assert.equal(esFechaReal(ok), true, ok);
  for (const mal of ["2031-02-31", "2031-02-29", "2100-02-29", "2031-13-01", "2031-00-10", "2031-04-31", "2031-1-1", "1899-12-31", "2201-01-01", "", null, undefined, 20310312])
    assert.equal(esFechaReal(mal), false, String(mal));
});

test("mesValidoOActual devuelve el mes pedido solo si es un mes real", () => {
  assert.equal(mesValidoOActual("2031-03"), "2031-03");
  const actual = hoyLocal().slice(0, 7);
  for (const mal of ["2031-13", "2031-00", "9999-12", "1000-01", "marzo", "", undefined, "2031-3"]) assert.equal(mesValidoOActual(mal), actual, String(mal));
});

test("fechaRelativa y fechaDelDia calculan sin saltos de mes ni de zona horaria", () => {
  assert.equal(fechaRelativa(0), hoyLocal());
  assert.ok(fechaRelativa(1) > hoyLocal() && fechaRelativa(-1) < hoyLocal());
  assert.equal(fechaDelDia("2030-01-30", 3), "2030-02-01");
});

test("un identificador que no es entero positivo responde 404, nunca 500, en las rutas públicas", async () => {
  const rutas = ["/sitios/ID", "/sitios/ID/resenas", "/sitios/ID/cotizar", "/sitios/ID/disponibilidad", "/sitios/ID/fechas-bloqueadas",
    "/paquetes/ID", "/paquetes/ID/resenas", "/paquetes/ID/disponibilidad", "/paquetes/ID/fechas-bloqueadas", "/prestadores/ID/publico"];
  for (const ruta of rutas) {
    for (const id of IDS_MALOS) {
      const res = await api("get", ruta.replace("ID", id));
      assert.equal(res.status, 404, `${ruta.replace("ID", id)} → ${res.status}`);
      assert.equal(res.body.error, "Recurso no encontrado.");
    }
  }
});

test("lo mismo vale con sesión: reservas, notificaciones, favoritos, itinerarios y administración", async () => {
  const t = await registrar("turista");
  const prest = await registrar("prestador");
  const admin = await registrar("turista");
  await Usuario.update({ rol: "administrador" }, { where: { id: admin.usuario.id } });
  const casos = [
    ["get", "/reservas/abc", t], ["patch", "/reservas/abc/cancelar", t], ["patch", "/reservas/abc/editar", t], ["post", "/reservas/abc/resena", t],
    ["patch", "/reservas/abc/confirmar", prest], ["patch", "/reservas/abc/rechazar", prest], ["patch", "/reservas/abc/asistencia", prest],
    ["patch", "/notificaciones/abc/leido", t], ["post", "/favoritos/abc", t], ["delete", "/favoritos/abc", t], ["get", "/itinerarios/abc", t],
    ["put", "/sitios/abc", prest], ["delete", "/sitios/abc", prest], ["post", "/sitios/abc/fechas-bloqueadas", prest], ["delete", "/sitios/1/fechas-bloqueadas/abc", prest], ["delete", "/sitios/1/imagenes/abc", prest],
    ["patch", "/paquetes/abc/estado", prest], ["delete", "/paquetes/abc", prest], ["delete", "/paquetes/1/imagenes/abc", prest],
    ["patch", "/prestadores/abc/verificar", admin], ["post", "/prestadores/abc/enviar-revision", prest], ["put", "/prestadores/abc", prest],
    ["patch", "/admin/usuarios/abc/estado", admin], ["patch", "/admin/sitios/abc/estado", admin], ["delete", "/admin/resenas/abc", admin],
    ["put", "/resenas/abc/respuesta", prest],
  ];
  for (const [metodo, ruta, quien] of casos) {
    const res = await api(metodo, ruta).set(auth(quien.token)).send({});
    assert.equal(res.status, 404, `${metodo.toUpperCase()} ${ruta} → ${res.status}`);
  }
});

test("un id válido que no existe sigue dando su 404 normal, y uno que existe funciona", async () => {
  const prest = await registrar("prestador");
  const p = await Prestador.create({ usuario_id: prest.usuario.id, nombre_negocio: "Ids", categoria: "Naturaleza", municipio: "Florencia", estado_verificacion: "aprobado" });
  const sitio = await SitioTuristico.create({ nombre: "Existe", categoria: "Naturaleza", municipio: "Florencia", precio: 1000, prestador_id: p.id });
  assert.equal((await api("get", `/sitios/${sitio.id}`)).status, 200);
  const noExiste = await api("get", "/sitios/2147483647");
  assert.equal(noExiste.status, 404);
  assert.equal(noExiste.body.error, "Sitio no encontrado.");
  assert.equal((await api("get", "/sitios/2147483648")).body.error, "Recurso no encontrado."); // fuera del rango de la base
});

test("los filtros del catálogo que no son válidos se ignoran en lugar de romper la búsqueda", async () => {
  const municipio = `Municipio Validacion ${Date.now()}`;
  const prest = await registrar("prestador");
  const p = await Prestador.create({ usuario_id: prest.usuario.id, nombre_negocio: "Filtros inválidos", categoria: "Naturaleza", municipio, estado_verificacion: "aprobado" });
  await SitioTuristico.create({ nombre: "Uno", categoria: "Naturaleza", municipio, precio: 5000, prestador_id: p.id });
  await SitioTuristico.create({ nombre: "Dos", categoria: "Naturaleza", municipio, precio: 90000, prestador_id: p.id });
  const base = `/sitios?municipio=${encodeURIComponent(municipio)}`;

  assert.equal((await api("get", base)).body.total, 2);
  for (const malo of ["presupuesto_max=abc", "presupuesto_max=-5", "presupuesto_max=", "fecha=2031-02-31", "fecha=2031-13-45", "fecha=ayer", "calificacion_min=abc", "lat=x&lng=y&orden=cercania", "page=-3&limit=zzz"]) {
    const res = await api("get", `${base}&${malo}`);
    assert.equal(res.status, 200, malo);
    assert.equal(res.body.total, 2, malo);
  }
  assert.equal((await api("get", `${base}&presupuesto_max=10000`)).body.total, 1); // un valor válido sí filtra
});

test("cotizar y calendario aceptan solo valores razonables y usan valores por defecto con los demás", async () => {
  const prest = await registrar("prestador");
  const p = await Prestador.create({ usuario_id: prest.usuario.id, nombre_negocio: "Cotiza", categoria: "Naturaleza", municipio: "Florencia", estado_verificacion: "aprobado" });
  const sitio = await SitioTuristico.create({ nombre: "Cotizable", categoria: "Naturaleza", municipio: "Florencia", precio: 10000, prestador_id: p.id });

  const enorme = await api("get", `/sitios/${sitio.id}/cotizar?personas=999999999999&ninos=5`);
  assert.equal(enorme.status, 200);
  assert.equal(enorme.body.adultos + enorme.body.ninos, 500); // tope de personas, el mismo de una reserva
  const fechaMala = await api("get", `/sitios/${sitio.id}/cotizar?fecha=2031-02-31`);
  assert.equal(fechaMala.status, 200); // usa la fecha de hoy en vez de romper

  const actual = hoyLocal().slice(0, 7);
  for (const mes of ["2031-13", "9999-12", "0001-01", "abc"]) {
    const cal = await api("get", `/sitios/${sitio.id}/disponibilidad?mes=${mes}`);
    assert.equal(cal.status, 200);
    assert.equal(cal.body.mes, actual, mes);
  }
});

test("las fechas imposibles se rechazan con un mensaje claro al reservar, planear o bloquear", async () => {
  const prest = await registrar("prestador");
  const p = await Prestador.create({ usuario_id: prest.usuario.id, nombre_negocio: "Fechas", categoria: "Naturaleza", municipio: "Florencia", estado_verificacion: "aprobado" });
  const sitio = await SitioTuristico.create({ nombre: "Fechas", categoria: "Naturaleza", municipio: "Florencia", precio: 1000, prestador_id: p.id });
  const t = await registrar("turista");

  const reserva = await api("post", "/reservas").set(auth(t.token)).send({ sitio_id: sitio.id, fecha_servicio: "2031-02-31" });
  assert.equal(reserva.status, 400);
  assert.match(reserva.body.error, /no existe en el calendario/);

  const itinerario = await api("post", "/itinerarios").set(auth(t.token)).send({ presupuesto: 100000, dias: 2, fecha_inicio: "2031-11-31" });
  assert.equal(itinerario.status, 400);

  const bloqueo = await api("post", `/sitios/${sitio.id}/fechas-bloqueadas`).set(auth(prest.token)).send({ fecha: "2031-13-01" });
  assert.equal(bloqueo.status, 400);

  const temporada = await api("put", `/sitios/${sitio.id}`).set(auth(prest.token)).send({
    nombre: "Fechas", categoria: "Naturaleza", municipio: "Florencia", precio: 1000,
    temporadas: [{ nombre: "Rara", fecha_desde: "2031-02-30", fecha_hasta: "2031-03-10", precio: 2000 }],
  });
  assert.equal(temporada.status, 400);

  const periodo = await api("get", "/prestadores/me/estadisticas?desde=2031-02-31&hasta=2031-03-10").set(auth(prest.token));
  assert.equal(periodo.status, 400);
});
