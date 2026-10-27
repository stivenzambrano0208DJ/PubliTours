const test = require("node:test");
const assert = require("node:assert/strict");
const { sequelize, registrar, auth, api, enDias } = require("./helpers");
const { Prestador, SitioTuristico, Paquete, PaqueteItem, Usuario } = require("../src/models");

test.after(() => sequelize.close());

const hoy = () => Date.now();

// Un negocio aprobado con un servicio y un paquete de dos servicios, en un municipio exclusivo de la prueba.
async function negocio() {
  const municipio = `Visibilidad ${hoy()}${Math.random().toString(36).slice(2, 6)}`;
  const prest = await registrar("prestador");
  const p = await Prestador.create({ usuario_id: prest.usuario.id, nombre_negocio: "Negocio visible", categoria: "Naturaleza", municipio, estado_verificacion: "aprobado" });
  const crear = (nombre) => SitioTuristico.create({ nombre, categoria: "Naturaleza", municipio, precio: 10000, prestador_id: p.id, motivo_moderacion: "Motivo interno" });
  const [a, b] = [await crear("Servicio A"), await crear("Servicio B")];
  const paquete = await Paquete.create({ prestador_id: p.id, nombre: "Paquete visible", precio: 15000 });
  await PaqueteItem.bulkCreate([{ paquete_id: paquete.id, sitio_id: a.id, dia: 1, orden: 1 }, { paquete_id: paquete.id, sitio_id: b.id, dia: 2, orden: 1 }]);
  return { municipio, prest, p, a, b, paquete };
}
const enCatalogo = async (n) => (await api("get", `/sitios?municipio=${encodeURIComponent(n.municipio)}`)).body.resultados.map((s) => s.nombre).sort();
const enPaquetes = async (n) => (await api("get", "/paquetes")).body.some((p) => p.id === n.paquete.id);

test("un negocio operativo es visible en el catálogo, los paquetes y el detalle", async () => {
  const n = await negocio();
  assert.deepEqual(await enCatalogo(n), ["Servicio A", "Servicio B"]);
  assert.equal(await enPaquetes(n), true);
  assert.equal((await api("get", `/sitios/${n.a.id}`)).status, 200);
  assert.equal((await api("get", `/paquetes/${n.paquete.id}`)).status, 200);
});

test("si el administrador suspende al prestador, todo lo suyo deja de ser público y se puede recuperar", async () => {
  const n = await negocio();
  await Usuario.update({ activo: false }, { where: { id: n.prest.usuario.id } });

  assert.deepEqual(await enCatalogo(n), []);
  assert.equal(await enPaquetes(n), false);
  assert.equal((await api("get", `/sitios/${n.a.id}`)).status, 404);
  assert.equal((await api("get", `/paquetes/${n.paquete.id}`)).status, 404);

  await Usuario.update({ activo: true }, { where: { id: n.prest.usuario.id } });
  assert.deepEqual(await enCatalogo(n), ["Servicio A", "Servicio B"]);
  assert.equal(await enPaquetes(n), true);
});

test("un negocio rechazado después de aprobado deja de publicar", async () => {
  const n = await negocio();
  await Prestador.update({ estado_verificacion: "rechazado" }, { where: { id: n.p.id } });
  assert.deepEqual(await enCatalogo(n), []);
  assert.equal(await enPaquetes(n), false);
  assert.equal((await api("get", `/sitios/${n.a.id}`)).status, 404);
});

test("no se puede reservar ni favorecer a un prestador suspendido, y sus favoritos previos desaparecen de la lista", async () => {
  const n = await negocio();
  const t = await registrar("turista");
  assert.equal((await api("post", `/favoritos/${n.a.id}`).set(auth(t.token))).status, 201);
  assert.equal((await api("get", "/favoritos").set(auth(t.token))).body.length, 1);

  await Usuario.update({ activo: false }, { where: { id: n.prest.usuario.id } });
  const reserva = await api("post", "/reservas").set(auth(t.token)).send({ sitio_id: n.a.id, fecha_servicio: enDias(5) });
  assert.equal(reserva.status, 400);
  assert.match(reserva.body.error, /no está disponible/);
  const paquete = await api("post", "/reservas").set(auth(t.token)).send({ paquete_id: n.paquete.id, fecha_servicio: enDias(5) });
  assert.equal(paquete.status, 400);
  assert.equal((await api("post", `/favoritos/${n.b.id}`).set(auth(t.token))).status, 404);
  assert.deepEqual((await api("get", "/favoritos").set(auth(t.token))).body, []);

  await Usuario.update({ activo: true }, { where: { id: n.prest.usuario.id } });
  assert.equal((await api("post", "/reservas").set(auth(t.token)).send({ sitio_id: n.a.id, fecha_servicio: enDias(5) })).status, 201);
});

test("los itinerarios no recomiendan servicios de un prestador suspendido", async () => {
  const n = await negocio();
  const t = await registrar("turista");
  const pedir = () => api("post", "/itinerarios").set(auth(t.token)).send({ presupuesto: 500000, dias: 2, municipio: n.municipio });
  assert.equal((await pedir()).status, 201);
  await Usuario.update({ activo: false }, { where: { id: n.prest.usuario.id } });
  const sin = await pedir();
  assert.equal(sin.status, 400); // no queda ningún servicio elegible en ese municipio
  assert.match(sin.body.error, /No hay suficientes sitios/);
});

test("un servicio oculto por moderación o archivado no existe para el público", async () => {
  const n = await negocio();
  for (const estado of ["oculto", "archivado"]) {
    await SitioTuristico.update({ estado }, { where: { id: n.a.id } });
    assert.equal((await api("get", `/sitios/${n.a.id}`)).status, 404, estado);
    assert.ok(!(await enCatalogo(n)).includes("Servicio A"), estado);
  }
  // pausado por su dueño: el enlace sigue funcionando y la página avisa que no está disponible
  await SitioTuristico.update({ estado: "inactivo" }, { where: { id: n.a.id } });
  const pausado = await api("get", `/sitios/${n.a.id}`);
  assert.equal(pausado.status, 200);
  assert.equal(pausado.body.estado, "inactivo");
});

test("el motivo de moderación es interno: no se devuelve en el detalle público de servicios ni de paquetes", async () => {
  const n = await negocio();
  await Paquete.update({ motivo_moderacion: "Otro motivo interno" }, { where: { id: n.paquete.id } });
  const sitio = await api("get", `/sitios/${n.a.id}`);
  assert.equal(sitio.status, 200);
  assert.ok(!("motivo_moderacion" in sitio.body));
  assert.ok(!JSON.stringify(sitio.body).includes("Motivo interno"));
  const paquete = await api("get", `/paquetes/${n.paquete.id}`);
  assert.ok(!("motivo_moderacion" in paquete.body));

  await Paquete.update({ estado: "oculto" }, { where: { id: n.paquete.id } });
  assert.equal((await api("get", `/paquetes/${n.paquete.id}`)).status, 404);
});

test("el prestador sí ve el motivo y su galería en sus propios servicios, aunque estén ocultos", async () => {
  const n = await negocio();
  await SitioTuristico.update({ estado: "oculto" }, { where: { id: n.a.id } });
  const mios = await api("get", "/prestadores/me/sitios").set(auth(n.prest.token));
  const a = mios.body.find((s) => s.id === n.a.id);
  assert.equal(a.estado, "oculto");
  assert.equal(a.motivo_moderacion, "Motivo interno");
  assert.ok(Array.isArray(a.imagenes));
});

test("los servicios sin prestador (cargados por el administrador) siguen siendo públicos", async () => {
  const municipio = `Sin prestador ${hoy()}`;
  await SitioTuristico.create({ nombre: "Del administrador", categoria: "Naturaleza", municipio, precio: 0 });
  const res = await api("get", `/sitios?municipio=${encodeURIComponent(municipio)}`);
  assert.deepEqual(res.body.resultados.map((s) => s.nombre), ["Del administrador"]);
});
