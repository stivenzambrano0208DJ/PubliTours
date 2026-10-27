const test = require("node:test");
const assert = require("node:assert/strict");
const bcrypt = require("bcryptjs");
const { sequelize, registrar, auth, api } = require("./helpers");
const { Prestador, Reserva, Usuario } = require("../src/models");

test.after(() => sequelize.close());


async function negocio(estado = "aprobado") {
  const prest = await registrar("prestador");
  const p = await Prestador.create({
    usuario_id: prest.usuario.id, nombre_negocio: `Finca ${Date.now()}`, categoria: "Hospedaje", municipio: "Florencia",
    descripcion: "Una finca con cabañas y senderos.", telefono: "3001234567", direccion: "Vereda El Caraño, km 4",
    redes: "instagram.com/finca", estado_verificacion: estado,
  });
  return { prest, p };
}
const crearSitio = async (prest, p, nombre, precio = 20000) =>
  (await api("post", "/sitios").set(auth(prest.token)).send({ nombre, categoria: "Naturaleza", municipio: "Florencia", precio, prestador_id: p.id })).body;

test("la página pública del negocio reúne contacto, servicios activos, paquetes y reseñas", async () => {
  const { prest, p } = await negocio();
  const a = await crearSitio(prest, p, "Cabañas del río", 80000);
  const b = await crearSitio(prest, p, "Cabalgata", 40000);
  const pausado = await crearSitio(prest, p, "Servicio pausado");
  await api("put", `/sitios/${pausado.id}`).set(auth(prest.token)).send({ ...pausado, estado: "inactivo" });
  const paquete = (await api("post", "/paquetes").set(auth(prest.token)).send({
    nombre: "Fin de semana", precio: 100000, sitios: [{ sitio_id: a.id, dia: 1 }, { sitio_id: b.id, dia: 2 }],
  })).body;

  // una reseña del servicio y otra del paquete
  const turista = await registrar("turista");
  const r1 = await Reserva.create({ turista_id: turista.usuario.id, sitio_id: a.id, prestador_id: p.id, fecha_servicio: "2020-01-01", estado: "completada" });
  const r2 = await Reserva.create({ turista_id: turista.usuario.id, sitio_id: a.id, paquete_id: paquete.id, prestador_id: p.id, fecha_servicio: "2020-02-02", estado: "completada" });
  await api("post", `/reservas/${r1.id}/resena`).set(auth(turista.token)).send({ calificacion: 5, comentario: "Excelente servicio" });
  await api("post", `/reservas/${r2.id}/resena`).set(auth(turista.token)).send({ calificacion: 3, comentario: "Paquete regular" });

  const res = await api("get", `/prestadores/${p.id}/publico`); // sin sesión
  assert.equal(res.status, 200);
  assert.equal(res.body.nombre_negocio, p.nombre_negocio);
  assert.equal(res.body.direccion, "Vereda El Caraño, km 4");
  assert.equal(res.body.telefono, "3001234567");
  assert.equal(res.body.redes, "instagram.com/finca");
  assert.ok(res.body.miembro_desde);

  assert.deepEqual(res.body.servicios.map((s) => s.nombre).sort(), ["Cabalgata", "Cabañas del río"]); // sin el pausado
  assert.equal(res.body.servicios.find((s) => s.id === a.id).total_resenas, 1);
  assert.equal(res.body.paquetes.length, 1);
  assert.equal(res.body.paquetes[0].nombre, "Fin de semana");

  assert.equal(res.body.resenas.total, 2);
  assert.equal(res.body.resenas.promedio, 4); // (5 + 3) / 2
  const objetivos = res.body.resenas.recientes.map((r) => (r.Paquete ? `paquete:${r.Paquete.nombre}` : `servicio:${r.SitioTuristico.nombre}`)).sort();
  assert.deepEqual(objetivos, ["paquete:Fin de semana", "servicio:Cabañas del río"]);
});

test("no se muestra un negocio sin aprobar (incompleto, pendiente o rechazado) ni inexistente", async () => {
  for (const estado of ["incompleto", "pendiente", "rechazado"]) {
    const { p } = await negocio(estado);
    assert.equal((await api("get", `/prestadores/${p.id}/publico`)).status, 404, estado);
  }
  assert.equal((await api("get", "/prestadores/999999/publico")).status, 404);
});

test("el negocio de una cuenta suspendida deja de mostrarse", async () => {
  const { p, prest } = await negocio();
  assert.equal((await api("get", `/prestadores/${p.id}/publico`)).status, 200);
  await Usuario.update({ activo: false }, { where: { id: prest.usuario.id } });
  assert.equal((await api("get", `/prestadores/${p.id}/publico`)).status, 404);
});

test("la ruta pública no interfiere con las rutas propias del prestador", async () => {
  const { prest } = await negocio();
  assert.equal((await api("get", "/prestadores/me").set(auth(prest.token))).status, 200);
  assert.equal((await api("get", "/prestadores/me/sitios").set(auth(prest.token))).status, 200);
  assert.ok(bcrypt); // evita aviso de import sin uso en esta suite
});
