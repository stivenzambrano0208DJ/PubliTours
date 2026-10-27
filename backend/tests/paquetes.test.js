const test = require("node:test");
const assert = require("node:assert/strict");
const { request, app, sequelize, registrar, auth, api } = require("./helpers");
const { Prestador, Reserva } = require("../src/models");

test.after(() => sequelize.close());

const manana = () => new Date(Date.now() + 864e5).toISOString().slice(0, 10);
const enDias = (n) => new Date(Date.now() + n * 864e5).toISOString().slice(0, 10);

async function prestadorConServicios(n = 3) {
  const prest = await registrar("prestador");
  const p = await Prestador.create({
    usuario_id: prest.usuario.id, nombre_negocio: `Finca ${Date.now()}`, categoria: "Hospedaje", municipio: "Florencia", estado_verificacion: "aprobado",
  });
  const sitios = [];
  for (let i = 1; i <= n; i++) {
    const r = await api("post", "/sitios").set(auth(prest.token)).send({
      nombre: `Servicio ${i} ${Date.now()}`, categoria: "Naturaleza", municipio: "Florencia", precio: i * 20000, prestador_id: p.id,
    });
    sitios.push(r.body);
  }
  return { prest, prestador: p, sitios };
}

const datosPaquete = (sitios, extra = {}) => ({
  nombre: "Fin de semana completo", descripcion: "Hospedaje + cabalgata + comida", precio: 90000,
  sitios: sitios.map((s, i) => ({ sitio_id: s.id, dia: i + 1 })), ...extra,
});

test("el prestador crea un paquete con sus servicios y se calcula el ahorro", async () => {
  const { prest, sitios } = await prestadorConServicios(3); // 20.000 + 40.000 + 60.000 = 120.000 por separado
  const r = await api("post", "/paquetes").set(auth(prest.token)).send(datosPaquete(sitios));
  assert.equal(r.status, 201);
  assert.equal(r.body.items.length, 3);
  assert.equal(r.body.precio_suelto, 120000);
  assert.equal(r.body.ahorro, 30000);

  const publico = await api("get", "/paquetes");
  assert.ok(publico.body.some((p) => p.id === r.body.id));
  assert.equal((await api("get", `/paquetes/${r.body.id}`)).body.nombre, "Fin de semana completo");
});

test("validaciones: mínimo 2 servicios, solo propios y activos, sin repetir, solo prestador", async () => {
  const { prest, sitios } = await prestadorConServicios(3);
  const otro = await prestadorConServicios(2);
  const turista = await registrar("turista");

  assert.equal((await api("post", "/paquetes").set(auth(prest.token)).send(datosPaquete(sitios.slice(0, 1)))).status, 400);
  assert.equal((await api("post", "/paquetes").set(auth(turista.token)).send(datosPaquete(sitios))).status, 403);

  const ajeno = await api("post", "/paquetes").set(auth(prest.token)).send(datosPaquete([sitios[0], otro.sitios[0]]));
  assert.equal(ajeno.status, 400);
  assert.match(ajeno.body.error, /tu propio negocio/);

  assert.equal((await api("post", "/paquetes").set(auth(prest.token)).send(datosPaquete([sitios[0], sitios[0]]))).status, 400);

  await api("put", `/sitios/${sitios[1].id}`).set(auth(prest.token)).send({ ...sitios[1], estado: "inactivo" });
  const inactivo = await api("post", "/paquetes").set(auth(prest.token)).send(datosPaquete(sitios));
  assert.equal(inactivo.status, 400);
  assert.match(inactivo.body.error, /no está activo/);
});

test("reservar un paquete: una sola reserva, total = precio del paquete por personas", async () => {
  const { prest, sitios } = await prestadorConServicios(2);
  const paquete = (await api("post", "/paquetes").set(auth(prest.token)).send(datosPaquete(sitios, { precio: 50000 }))).body;
  const turista = await registrar("turista");

  assert.equal((await api("post", "/reservas").set(auth(turista.token)).send({ fecha_servicio: manana() })).status, 400); // ni servicio ni paquete
  assert.equal((await api("post", "/reservas").set(auth(turista.token)).send({ sitio_id: sitios[0].id, paquete_id: paquete.id, fecha_servicio: manana() })).status, 400); // ambos
  assert.equal((await api("post", "/reservas").set(auth(prest.token)).send({ paquete_id: paquete.id, fecha_servicio: manana() })).status, 400); // el prestador no reserva lo suyo

  const r = await api("post", "/reservas").set(auth(turista.token)).send({ paquete_id: paquete.id, fecha_servicio: manana(), personas: 3, nota: "Con ninos" });
  assert.equal(r.status, 201);
  assert.equal(r.body.paquete_id, paquete.id);
  assert.equal(Number(r.body.total), 150000);

  const mias = await api("get", "/reservas/mias").set(auth(turista.token));
  assert.equal(mias.body.length, 1);
  assert.equal(mias.body[0].paquete.nombre, "Fin de semana completo");
  assert.equal(mias.body[0].paquete.items.length, 2);

  const recibidas = await api("get", "/reservas/recibidas").set(auth(prest.token));
  assert.equal(recibidas.body[0].paquete.nombre, "Fin de semana completo");
  const notifs = await api("get", "/notificaciones").set(auth(prest.token));
  assert.ok(notifs.body.some((n) => n.mensaje.includes("el paquete \"Fin de semana completo\"")));
});

test("un día bloqueado en cualquier servicio bloquea el paquete; los cupos son del paquete", async () => {
  const { prest, sitios } = await prestadorConServicios(2);
  const paquete = (await api("post", "/paquetes").set(auth(prest.token)).send(datosPaquete(sitios, { capacidad: 4 }))).body;
  const t1 = await registrar("turista");
  const t2 = await registrar("turista");

  await api("post", `/sitios/${sitios[1].id}/fechas-bloqueadas`).set(auth(prest.token)).send({ fecha: manana(), motivo: "Mantenimiento del rio" });
  const fechas = await api("get", `/paquetes/${paquete.id}/fechas-bloqueadas`);
  assert.equal(fechas.body.length, 1);
  assert.equal(fechas.body[0].fecha, manana());
  const bloqueada = await api("post", "/reservas").set(auth(t1.token)).send({ paquete_id: paquete.id, fecha_servicio: manana() });
  assert.equal(bloqueada.status, 400);
  assert.match(bloqueada.body.error, /Mantenimiento del rio/);

  const dia = enDias(3);
  assert.equal((await api("post", "/reservas").set(auth(t1.token)).send({ paquete_id: paquete.id, fecha_servicio: dia, personas: 5 })).status, 400); // supera el cupo
  const a = await api("post", "/reservas").set(auth(t1.token)).send({ paquete_id: paquete.id, fecha_servicio: dia, personas: 3 });
  const b = await api("post", "/reservas").set(auth(t2.token)).send({ paquete_id: paquete.id, fecha_servicio: dia, personas: 2 });
  assert.equal((await api("patch", `/reservas/${a.body.id}/confirmar`).set(auth(prest.token))).status, 200);
  const sinCupo = await api("patch", `/reservas/${b.body.id}/confirmar`).set(auth(prest.token));
  assert.equal(sinCupo.status, 400);
  assert.match(sinCupo.body.error, /cupos/);
});

test("el paquete deja de estar disponible si uno de sus servicios se pausa", async () => {
  const { prest, sitios } = await prestadorConServicios(2);
  const paquete = (await api("post", "/paquetes").set(auth(prest.token)).send(datosPaquete(sitios))).body;
  const turista = await registrar("turista");

  await api("put", `/sitios/${sitios[0].id}`).set(auth(prest.token)).send({ ...sitios[0], estado: "inactivo" });
  assert.ok(!(await api("get", "/paquetes")).body.some((p) => p.id === paquete.id));
  assert.equal((await api("post", "/reservas").set(auth(turista.token)).send({ paquete_id: paquete.id, fecha_servicio: manana() })).status, 400);
});

test("editar, pausar y eliminar un paquete; un servicio dentro de un paquete no se puede eliminar", async () => {
  const { prest, sitios } = await prestadorConServicios(3);
  const otro = await registrar("prestador");
  const paquete = (await api("post", "/paquetes").set(auth(prest.token)).send(datosPaquete(sitios.slice(0, 2)))).body;

  assert.equal((await api("put", `/paquetes/${paquete.id}`).set(auth(otro.token)).send(datosPaquete(sitios.slice(0, 2)))).status, 400); // no es suyo
  const editado = await api("put", `/paquetes/${paquete.id}`).set(auth(prest.token)).send(datosPaquete(sitios, { nombre: "Paquete ampliado", precio: 100000 }));
  assert.equal(editado.status, 200);
  assert.equal(editado.body.items.length, 3);
  assert.equal(editado.body.nombre, "Paquete ampliado");

  const eliminarSitio = await api("delete", `/sitios/${sitios[0].id}`).set(auth(prest.token));
  assert.equal(eliminarSitio.status, 400);
  assert.match(eliminarSitio.body.error, /Paquete ampliado/);

  await api("patch", `/paquetes/${paquete.id}/estado`).set(auth(prest.token)).send({ estado: "inactivo" });
  assert.ok(!(await api("get", "/paquetes")).body.some((p) => p.id === paquete.id));
  assert.ok((await api("get", "/paquetes/mios").set(auth(prest.token))).body.some((p) => p.id === paquete.id));

  // con una reserva pendiente no se puede eliminar
  await api("patch", `/paquetes/${paquete.id}/estado`).set(auth(prest.token)).send({ estado: "activo" });
  const turista = await registrar("turista");
  const r = await api("post", "/reservas").set(auth(turista.token)).send({ paquete_id: paquete.id, fecha_servicio: manana() });
  assert.equal((await api("delete", `/paquetes/${paquete.id}`).set(auth(prest.token))).status, 400);
  await api("patch", `/reservas/${r.body.id}/rechazar`).set(auth(prest.token)).send({});
  assert.equal((await api("delete", `/paquetes/${paquete.id}`).set(auth(prest.token))).status, 200);
  assert.equal((await api("get", `/paquetes/${paquete.id}`)).status, 404);
});

test("reseñas de paquetes: se califican, promedian, el prestador responde y no afectan al servicio", async () => {
  const { prest, prestador, sitios } = await prestadorConServicios(2);
  const otro = await registrar("prestador");
  const paquete = (await api("post", "/paquetes").set(auth(prest.token)).send(datosPaquete(sitios))).body;
  const turista = await registrar("turista");
  const pasada = await Reserva.create({
    turista_id: turista.usuario.id, sitio_id: sitios[0].id, paquete_id: paquete.id, prestador_id: prestador.id, fecha_servicio: "2020-01-01", estado: "completada",
  });

  assert.equal((await api("post", `/reservas/${pasada.id}/resena`).set(auth(turista.token)).send({ calificacion: 6 })).status, 400);
  const ok = await api("post", `/reservas/${pasada.id}/resena`).set(auth(turista.token)).send({ calificacion: 5, comentario: "Paquete perfecto" });
  assert.equal(ok.status, 201);
  assert.equal(ok.body.paquete_id, paquete.id);
  assert.equal(ok.body.sitio_id, null);
  assert.equal((await api("post", `/reservas/${pasada.id}/resena`).set(auth(turista.token)).send({ calificacion: 4 })).status, 400); // una por reserva

  const lista = await api("get", `/paquetes/${paquete.id}/resenas`);
  assert.equal(lista.body.total, 1);
  assert.equal(lista.body.promedio, 5);
  assert.equal((await api("get", `/paquetes/${paquete.id}`)).body.total_resenas, 1);
  assert.equal((await api("get", "/paquetes")).body.find((p) => p.id === paquete.id).calificacion_promedio, 5);
  assert.equal((await api("get", `/sitios/${sitios[0].id}/resenas`)).body.total, 0); // no cuenta para el servicio ancla

  const recibidas = await api("get", "/prestadores/me/resenas").set(auth(prest.token));
  assert.equal(recibidas.body.length, 1);
  assert.equal(recibidas.body[0].Paquete.nombre, "Fin de semana completo");

  assert.equal((await api("put", `/resenas/${ok.body.id}/respuesta`).set(auth(otro.token)).send({ respuesta: "Hola" })).status, 400);
  const resp = await api("put", `/resenas/${ok.body.id}/respuesta`).set(auth(prest.token)).send({ respuesta: "Gracias por elegirnos" });
  assert.equal(resp.status, 200);
  assert.equal((await api("get", `/paquetes/${paquete.id}/resenas`)).body.resenas[0].respuesta, "Gracias por elegirnos");
});

test("el administrador oculta un paquete y el prestador no puede reactivarlo", async () => {
  const { Usuario } = require("../src/models");
  const bcrypt = require("bcryptjs");
  const admin = await Usuario.create({ nombre: "Admin", correo: `adm${Date.now()}@test.com`, password_hash: await bcrypt.hash("clave12345", 10), rol: "administrador" });
  const adminToken = (await api("post", "/auth/login").send({ correo: admin.correo, password: "clave12345" })).body.token;
  const { prest, sitios } = await prestadorConServicios(2);
  const turista = await registrar("turista");
  const paquete = (await api("post", "/paquetes").set(auth(prest.token)).send(datosPaquete(sitios))).body;

  assert.equal((await api("get", "/admin/paquetes").set(auth(prest.token))).status, 403);
  assert.ok((await api("get", "/admin/paquetes").set(auth(adminToken))).body.some((p) => p.id === paquete.id));

  const oculto = await api("patch", `/admin/paquetes/${paquete.id}/estado`).set(auth(adminToken)).send({ estado: "oculto", motivo: "Descripcion enganosa" });
  assert.equal(oculto.status, 200);
  assert.ok(!(await api("get", "/paquetes")).body.some((p) => p.id === paquete.id));
  assert.equal((await api("post", "/reservas").set(auth(turista.token)).send({ paquete_id: paquete.id, fecha_servicio: manana() })).status, 400);
  const aviso = await api("get", "/notificaciones").set(auth(prest.token));
  assert.ok(aviso.body.some((n) => n.tipo === "sitio_oculto" && n.mensaje.includes("Descripcion enganosa")));

  // el prestador no lo reactiva: ni con el botón de pausa ni editándolo
  const intento = await api("patch", `/paquetes/${paquete.id}/estado`).set(auth(prest.token)).send({ estado: "activo" });
  assert.equal(intento.status, 400);
  assert.match(intento.body.error, /Descripcion enganosa/);
  await api("put", `/paquetes/${paquete.id}`).set(auth(prest.token)).send(datosPaquete(sitios, { estado: "activo" }));
  assert.ok(!(await api("get", "/paquetes")).body.some((p) => p.id === paquete.id));
  assert.equal((await api("get", "/paquetes/mios").set(auth(prest.token))).body.find((p) => p.id === paquete.id).motivo_moderacion, "Descripcion enganosa");

  assert.equal((await api("patch", `/admin/paquetes/${paquete.id}/estado`).set(auth(adminToken)).send({ estado: "activo" })).status, 200);
  assert.ok((await api("get", "/paquetes")).body.some((p) => p.id === paquete.id));
  assert.equal((await api("patch", `/admin/paquetes/${paquete.id}/estado`).set(auth(adminToken)).send({ estado: "activo" })).status, 400); // ya no está oculto
});

test("foto de portada del paquete: se sube con el formulario, se conserva al editar y se reemplaza", async () => {
  const { prest, sitios } = await prestadorConServicios(2);
  const png = Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==", "base64");
  const crear = await api("post", "/paquetes").set(auth(prest.token))
    .field("nombre", "Paquete con foto").field("precio", "80000")
    .field("sitios", JSON.stringify(sitios.map((s, i) => ({ sitio_id: s.id, dia: i + 1 }))))
    .attach("imagen", png, { filename: "portada.png", contentType: "image/png" });
  assert.equal(crear.status, 201);
  assert.match(crear.body.imagen_url, /^\/uploads\/sitios\//);
  assert.equal((await request(app).get(crear.body.imagen_url)).status, 200);

  const sin = await api("put", `/paquetes/${crear.body.id}`).set(auth(prest.token)).send(datosPaquete(sitios));
  assert.equal(sin.body.imagen_url, crear.body.imagen_url); // sin archivo nuevo conserva la foto

  const nueva = await api("put", `/paquetes/${crear.body.id}`).set(auth(prest.token))
    .field("nombre", "Paquete con foto").field("precio", "80000")
    .field("sitios", JSON.stringify(sitios.map((s) => ({ sitio_id: s.id, dia: 1 }))))
    .attach("imagen", png, { filename: "otra.png", contentType: "image/png" });
  assert.equal(nueva.status, 200);
  assert.notEqual(nueva.body.imagen_url, crear.body.imagen_url);

  // la foto anterior se borra del disco al reemplazarla; se limpia también la de la prueba
  await new Promise((r) => setTimeout(r, 200));
  const fs = require("fs");
  const path = require("path");
  const ruta = (url) => path.join(__dirname, "..", "public", url);
  assert.equal(fs.existsSync(ruta(crear.body.imagen_url)), false);
  fs.rmSync(ruta(nueva.body.imagen_url), { force: true });
});

test("galería propia del paquete: varias fotos, solo el dueño, máximo 8 y se borran del disco", async () => {
  const fs = require("fs");
  const path = require("path");
  const { prest, sitios } = await prestadorConServicios(2);
  const otro = await registrar("prestador");
  const paquete = (await api("post", "/paquetes").set(auth(prest.token)).send(datosPaquete(sitios))).body;
  const png = Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==", "base64");
  const adjuntar = (token, id, n) => {
    let r = api("post", `/paquetes/${id}/imagenes`).set(auth(token));
    for (let i = 0; i < n; i++) r = r.attach("imagenes", png, { filename: `foto${i}.png`, contentType: "image/png" });
    return r;
  };
  const ruta = (url) => path.join(__dirname, "..", "public", url);

  assert.equal((await api("post", `/paquetes/${paquete.id}/imagenes`).set(auth(prest.token))).status, 400); // sin archivos
  assert.equal((await adjuntar(otro.token, paquete.id, 1)).status, 400); // no es suyo

  const subida = await adjuntar(prest.token, paquete.id, 3);
  assert.equal(subida.status, 201);
  assert.equal(subida.body.length, 3);
  assert.deepEqual(subida.body.map((i) => i.orden), [0, 1, 2]);

  const detalle = await api("get", `/paquetes/${paquete.id}`);
  assert.equal(detalle.body.imagenes.length, 3);
  assert.equal((await api("get", "/paquetes/mios").set(auth(prest.token))).body.find((p) => p.id === paquete.id).imagenes.length, 3);
  assert.equal((await request(app).get(subida.body[0].imagen_url)).status, 200);

  // máximo 8: 3 + 6 se pasa y no deja archivos huérfanos
  const archivosAntes = fs.readdirSync(path.join(__dirname, "..", "public", "uploads", "sitios")).length;
  const excedida = await adjuntar(prest.token, paquete.id, 6);
  assert.equal(excedida.status, 400);
  assert.match(excedida.body.error, /máximo 8/);
  await new Promise((r) => setTimeout(r, 200));
  assert.equal(fs.readdirSync(path.join(__dirname, "..", "public", "uploads", "sitios")).length, archivosAntes);

  // eliminar: solo el dueño; borra el archivo
  assert.equal((await api("delete", `/paquetes/${paquete.id}/imagenes/${subida.body[0].id}`).set(auth(otro.token))).status, 400);
  assert.equal((await api("delete", `/paquetes/${paquete.id}/imagenes/${subida.body[0].id}`).set(auth(prest.token))).status, 200);
  await new Promise((r) => setTimeout(r, 200));
  assert.equal(fs.existsSync(ruta(subida.body[0].imagen_url)), false);
  assert.equal((await api("get", `/paquetes/${paquete.id}`)).body.imagenes.length, 2);
  assert.equal((await api("delete", `/paquetes/${paquete.id}/imagenes/${subida.body[0].id}`).set(auth(prest.token))).status, 400); // ya no existe

  // limpieza de las fotos de la prueba
  subida.body.slice(1).forEach((i) => fs.rmSync(ruta(i.imagen_url), { force: true }));
});
