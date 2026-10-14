const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const { request, app, sequelize, registrar, auth } = require("./helpers");
const {
  Prestador, SitioTuristico, Reserva, Usuario, Notificacion, Conversacion, Mensaje, MensajeImagen, ReporteMensaje, Auditoria,
} = require("../src/models");
const { MENSAJES_POR_HORA, CONVERSACIONES_NUEVAS_POR_DIA, TEXTO_MAX } = require("../src/config/mensajeria");
const politicas = require("../src/politicas");

const DIR_PRIVADO = path.join(__dirname, "..", "public", "uploads", "privado", "mensajes");
const archivosPrivados = () => (fs.existsSync(DIR_PRIVADO) ? fs.readdirSync(DIR_PRIVADO).sort() : []);
const ANTES = new Set(archivosPrivados());

test.after(async () => {
  for (const f of archivosPrivados()) if (!ANTES.has(f)) fs.unlinkSync(path.join(DIR_PRIVADO, f)); // no deja fotos de prueba en el disco
  await sequelize.close();
});

const api = (m, url) => request(app)[m](`/api/v1${url}`);
const enDias = (n) => new Date(Date.now() + n * 864e5).toLocaleDateString("en-CA");
// Un PNG válido de 1×1 y otro "disfrazado": texto con extensión y tipo de imagen.
const PNG = Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR4nGP4z8DwHwAFAAH/q842iQAAAABJRU5ErkJggg==", "base64");
const FALSO = Buffer.from("<script>alert('no soy una imagen')</script>");
const foto = (req, buffer = PNG, nombre = "foto.png", tipo = "image/png") => req.attach("imagenes", buffer, { filename: nombre, contentType: tipo });

async function negocio(etiqueta, estado = "aprobado") {
  const cuenta = await registrar("prestador");
  const perfil = await Prestador.create({ usuario_id: cuenta.usuario.id, nombre_negocio: `Negocio ${etiqueta}`, categoria: "Naturaleza", municipio: `Municipio ${etiqueta}`, estado_verificacion: estado });
  const sitio = await SitioTuristico.create({ nombre: `Servicio ${etiqueta}`, categoria: "Naturaleza", municipio: perfil.municipio, precio: 20000, prestador_id: perfil.id });
  const sitio2 = await SitioTuristico.create({ nombre: `Otro ${etiqueta}`, categoria: "Naturaleza", municipio: perfil.municipio, precio: 30000, prestador_id: perfil.id });
  const paquete = (await api("post", "/paquetes").set(auth(cuenta.token)).send({
    nombre: `Paquete ${etiqueta}`, descripcion: "Dos servicios juntos", precio: 40000, sitios: [sitio, sitio2].map((s, i) => ({ sitio_id: s.id, dia: i + 1 })),
  })).body;
  return { cuenta, perfil, sitio, paquete };
}
const preguntar = (token, cuerpo) => api("post", "/conversaciones").set(auth(token)).send(cuerpo);
const escribir = (token, id, texto) => api("post", `/conversaciones/${id}/mensajes`).set(auth(token)).send({ texto });
const admin = async () => { const c = await registrar("turista"); await Usuario.update({ rol: "administrador" }, { where: { id: c.usuario.id } }); return c; };

// ---------------- Abrir una conversación ----------------
test("una turista pregunta por un servicio SIN tener reserva, y el negocio la ve con lo pendiente por leer", async () => {
  const n = await negocio("Pregunta");
  const turista = await registrar("turista");
  const res = await preguntar(turista.token, { sitio_id: n.sitio.id, texto: "¿Hay parqueadero?" });
  assert.equal(res.status, 201);
  assert.equal(res.body.mensaje.texto, "¿Hay parqueadero?");
  assert.equal(res.body.mensaje.de, "turista");
  assert.equal(res.body.mensaje.mio, true);
  assert.deepEqual(res.body.mensaje.contexto, { tipo: "sitio", id: n.sitio.id, nombre: n.sitio.nombre });

  const delNegocio = (await api("get", "/conversaciones").set(auth(n.cuenta.token))).body;
  assert.equal(delNegocio.length, 1);
  assert.equal(delNegocio[0].lado, "negocio");
  assert.equal(delNegocio[0].contraparte.nombre, "Usuario Prueba"); // el negocio ve el nombre de quien pregunta
  assert.equal(delNegocio[0].sin_leer, 1);
  assert.equal(delNegocio[0].ultimo.texto, "¿Hay parqueadero?");

  const delTurista = (await api("get", "/conversaciones").set(auth(turista.token))).body;
  assert.equal(delTurista[0].lado, "turista");
  assert.equal(delTurista[0].contraparte.nombre, n.perfil.nombre_negocio);
  assert.equal(delTurista[0].sin_leer, 0); // lo suyo no cuenta como pendiente
});

test("también se pregunta por un paquete o por una reserva propia, y no por una ajena", async () => {
  const n = await negocio("Contextos");
  const turista = await registrar("turista");
  const otra = await registrar("turista");
  const reserva = await Reserva.create({ turista_id: turista.usuario.id, sitio_id: n.sitio.id, prestador_id: n.perfil.id, fecha_servicio: enDias(10), estado: "confirmada", personas: 2, total: 40000 });

  const porPaquete = await preguntar(turista.token, { paquete_id: n.paquete.id, texto: "¿Incluye almuerzo?" });
  assert.equal(porPaquete.status, 201);
  assert.equal(porPaquete.body.mensaje.contexto.tipo, "paquete");
  const porReserva = await preguntar(turista.token, { reserva_id: reserva.id, texto: "¿A qué hora llegamos?" });
  assert.equal(porReserva.status, 201);
  assert.deepEqual(porReserva.body.mensaje.contexto, { tipo: "reserva", id: reserva.id, nombre: n.sitio.nombre });
  assert.equal(porReserva.body.conversacion_id, porPaquete.body.conversacion_id); // misma pareja: misma conversación

  const ajena = await preguntar(otra.token, { reserva_id: reserva.id, texto: "Hola" });
  assert.equal(ajena.status, 400);
  assert.equal(ajena.body.error, "Reserva no encontrada.");
  assert.equal(await Conversacion.count({ where: { turista_id: otra.usuario.id } }), 0);
});

test("hay que indicar exactamente un tema válido, y los servicios que no son públicos no reciben mensajes", async () => {
  const n = await negocio("Validacion");
  const turista = await registrar("turista");
  assert.equal((await preguntar(turista.token, { texto: "Sin tema" })).status, 400);
  assert.equal((await preguntar(turista.token, { sitio_id: n.sitio.id, paquete_id: n.paquete.id, texto: "Dos temas" })).status, 400);
  assert.equal((await preguntar(turista.token, { sitio_id: 2000000000, texto: "No existe" })).status, 404);
  await SitioTuristico.update({ estado: "oculto" }, { where: { id: n.sitio.id } });
  assert.equal((await preguntar(turista.token, { sitio_id: n.sitio.id, texto: "Oculto" })).status, 404);
  await SitioTuristico.update({ estado: "archivado" }, { where: { id: n.sitio.id } });
  assert.equal((await preguntar(turista.token, { sitio_id: n.sitio.id, texto: "Archivado" })).status, 404);
  assert.equal(await Conversacion.count({ where: { turista_id: turista.usuario.id } }), 0);
});

test("con la misma pareja siempre se usa la misma conversación (no se duplican)", async () => {
  const n = await negocio("Pareja");
  const turista = await registrar("turista");
  const a = await preguntar(turista.token, { sitio_id: n.sitio.id, texto: "Uno" });
  const b = await preguntar(turista.token, { sitio_id: n.sitio.id, texto: "Dos" });
  assert.equal(a.body.conversacion_id, b.body.conversacion_id);
  assert.equal(await Conversacion.count({ where: { turista_id: turista.usuario.id, prestador_id: n.perfil.id } }), 1);
  assert.equal(await Mensaje.count({ where: { conversacion_id: a.body.conversacion_id } }), 2);
});

// ---------------- El negocio solo responde ----------------
test("el negocio responde, pero nunca abre una conversación ni le escribe a su propio negocio", async () => {
  const n = await negocio("Responde");
  const turista = await registrar("turista");
  const abre = await preguntar(turista.token, { sitio_id: n.sitio.id, texto: "Hola, ¿abren domingos?" });
  const id = abre.body.conversacion_id;

  const respuesta = await escribir(n.cuenta.token, id, "Sí, de 8 a 5.");
  assert.equal(respuesta.status, 201);
  assert.equal(respuesta.body.de, "negocio");
  const hilo = (await api("get", `/conversaciones/${id}`).set(auth(turista.token))).body;
  assert.deepEqual(hilo.mensajes.map((m) => [m.de, m.mio, m.texto]), [["turista", true, "Hola, ¿abren domingos?"], ["negocio", false, "Sí, de 8 a 5."]]);
  assert.equal(hilo.lado, "turista");
  assert.equal(hilo.contraparte.nombre, n.perfil.nombre_negocio);

  // Nadie le escribe a su propio negocio (ni siquiera usando un servicio suyo como tema)
  assert.equal((await preguntar(n.cuenta.token, { sitio_id: n.sitio.id, texto: "Me escribo a mí" })).status, 400);
  assert.equal(await Conversacion.count({ where: { turista_id: n.cuenta.usuario.id } }), 0);

  // Un negocio que pregunta a OTRO negocio lo hace como cualquier turista
  const otro = await negocio("Otro");
  assert.equal((await preguntar(n.cuenta.token, { sitio_id: otro.sitio.id, texto: "Hola, colega" })).status, 201);
});

test("regla de producto: no hay ninguna forma de que un negocio escriba primero a una persona", async () => {
  const n = await negocio("Primero");
  const turista = await registrar("turista");
  // Aunque conozca el id de la turista o invente una conversación, no existe nada a lo que el negocio pueda escribir
  const intento = await preguntar(n.cuenta.token, { sitio_id: n.sitio.id, turista_id: turista.usuario.id, texto: "Te escribo primero" });
  assert.equal(intento.status, 400);
  assert.equal(await Mensaje.count({ where: { autor_id: n.cuenta.usuario.id } }), 0);
  assert.equal(await Conversacion.count({ where: { turista_id: turista.usuario.id } }), 0);
  // y una conversación creada a mano (sin mensaje de la turista) tampoco admite que el negocio la inicie
  const vacia = await Conversacion.create({ turista_id: turista.usuario.id, prestador_id: n.perfil.id });
  const res = await escribir(n.cuenta.token, vacia.id, "¿Hola?");
  assert.equal(res.status, 400);
  assert.equal(res.body.error, "Solo puedes responder a quien te escribió primero.");
});

// ---------------- Quién puede qué ----------------
test("solo las dos partes ven una conversación: un tercero no sabe ni que existe, y el administrador tampoco la lee", async () => {
  const n = await negocio("Privada");
  const turista = await registrar("turista");
  const tercero = await registrar("turista");
  const otroNegocio = await negocio("Curioso");
  const adm = await admin();
  const id = (await preguntar(turista.token, { sitio_id: n.sitio.id, texto: "Mensaje privado" })).body.conversacion_id;

  for (const quien of [tercero, otroNegocio.cuenta]) {
    assert.equal((await api("get", `/conversaciones/${id}`).set(auth(quien.token))).status, 404);
    assert.equal((await api("patch", `/conversaciones/${id}/leido`).set(auth(quien.token))).status, 404);
    assert.equal((await escribir(quien.token, id, "Me cuelo")).status, 404);
    assert.ok(!JSON.stringify((await api("get", "/conversaciones").set(auth(quien.token))).body).includes("Mensaje privado"));
  }
  assert.equal((await api("get", `/conversaciones/${id}`).set(auth(adm.token))).status, 403);
  assert.equal(await Mensaje.count({ where: { conversacion_id: id } }), 1); // nadie coló nada
});

test("abrir una conversación y escribir exigen correo verificado", async () => {
  const n = await negocio("Verificado");
  const sinVerificar = await registrar("turista", { verificado: false });
  const res = await preguntar(sinVerificar.token, { sitio_id: n.sitio.id, texto: "Hola" });
  assert.equal(res.status, 403);
  assert.equal(res.body.codigo, "CORREO_NO_VERIFICADO");

  const turista = await registrar("turista");
  const id = (await preguntar(turista.token, { sitio_id: n.sitio.id, texto: "Hola" })).body.conversacion_id;
  await Usuario.update({ correo_verificado: false }, { where: { id: turista.usuario.id } });
  assert.equal((await escribir(turista.token, id, "Otra vez")).status, 403);
});

test("un negocio suspendido o sin aprobar no recibe conversaciones nuevas ni puede seguir escribiendo", async () => {
  const sinAprobar = await negocio("SinAprobar", "pendiente");
  const turista = await registrar("turista");
  const res = await preguntar(turista.token, { sitio_id: sinAprobar.sitio.id, texto: "Hola" });
  assert.equal(res.status, 400);
  assert.match(res.body.error, /no está disponible/);

  const activo = await negocio("Activo");
  const id = (await preguntar(turista.token, { sitio_id: activo.sitio.id, texto: "Hola" })).body.conversacion_id;
  await Usuario.update({ activo: false }, { where: { id: activo.cuenta.usuario.id } }); // la administración lo suspende
  const despues = await escribir(turista.token, id, "¿Siguen ahí?");
  assert.equal(despues.status, 400);
  assert.match(despues.body.error, /no está disponible/);
  assert.equal((await api("get", `/conversaciones/${id}`).set(auth(turista.token))).body.puede_escribir, false);
});

// ---------------- Contenido ----------------
test("el texto se valida: no vacío, con tope de largo, y se entrega tal cual (sin interpretarlo como página)", async () => {
  const n = await negocio("Texto");
  const turista = await registrar("turista");
  assert.equal((await preguntar(turista.token, { sitio_id: n.sitio.id })).status, 400); // ni texto ni foto
  assert.equal((await preguntar(turista.token, { sitio_id: n.sitio.id, texto: "    " })).status, 400);
  const largo = await preguntar(turista.token, { sitio_id: n.sitio.id, texto: "a".repeat(TEXTO_MAX + 1) });
  assert.equal(largo.status, 400);
  assert.equal((await preguntar(turista.token, { sitio_id: n.sitio.id, texto: "a".repeat(TEXTO_MAX) })).status, 201); // justo en el tope

  const peligroso = "<script>alert('x')</script> <img src=x onerror=alert(1)>";
  const res = await preguntar(turista.token, { sitio_id: n.sitio.id, texto: peligroso });
  assert.equal(res.status, 201);
  assert.equal(res.body.mensaje.texto, peligroso); // se guarda tal cual; la pantalla lo muestra como texto
  assert.match(res.headers["content-type"], /application\/json/);
});

test("las fotos de una conversación son privadas: solo las ven sus dos partes, y nunca por la ruta pública de archivos", async () => {
  const n = await negocio("Fotos");
  const turista = await registrar("turista");
  const tercero = await registrar("turista");
  const adm = await admin();
  const antes = archivosPrivados();

  const res = await foto(api("post", "/conversaciones").set(auth(turista.token)).field("sitio_id", n.sitio.id).field("texto", "Así se ve el camino"));
  assert.equal(res.status, 201, JSON.stringify(res.body));
  assert.equal(res.body.mensaje.imagenes.length, 1);
  const imagenId = res.body.mensaje.imagenes[0].id;
  const nuevos = archivosPrivados().filter((f) => !antes.includes(f));
  assert.equal(nuevos.length, 1);
  assert.match(nuevos[0], /^msg-\d+-\d+\.png$/); // nombre generado por el servidor, no el original

  // Las dos partes la ven, con cabeceras que impiden guardarla en cachés compartidas o ejecutarla como página
  for (const quien of [turista, n.cuenta]) {
    const foto1 = await api("get", `/conversaciones/imagenes/${imagenId}`).set(auth(quien.token));
    assert.equal(foto1.status, 200);
    assert.equal(foto1.headers["content-type"], "image/png");
    assert.equal(foto1.headers["cache-control"], "private, no-store");
    assert.equal(foto1.headers["x-content-type-options"], "nosniff");
    assert.match(foto1.headers["content-security-policy"], /sandbox/);
  }
  // Nadie más: ni anónimo, ni otra persona, ni la administración (mientras nadie la reporte)
  assert.equal((await api("get", `/conversaciones/imagenes/${imagenId}`)).status, 401);
  assert.equal((await api("get", `/conversaciones/imagenes/${imagenId}`).set(auth(tercero.token))).status, 404);
  assert.equal((await api("get", `/conversaciones/imagenes/${imagenId}`).set(auth(adm.token))).status, 404);
  // Y la carpeta no se sirve como archivos públicos
  assert.equal((await request(app).get(`/uploads/privado/mensajes/${nuevos[0]}`)).status, 404);
  assert.equal((await request(app).get(`/uploads/privado/mensajes/../../uploads/privado/mensajes/${nuevos[0]}`)).status, 404);
});

test("se aceptan mensajes solo con fotos, pero no archivos disfrazados, de más de 5 MB ni más de las permitidas", async () => {
  const n = await negocio("Archivos");
  const turista = await registrar("turista");
  const antes = archivosPrivados();
  const base = () => api("post", "/conversaciones").set(auth(turista.token)).field("sitio_id", n.sitio.id);

  const soloFoto = await foto(base());
  assert.equal(soloFoto.status, 201);
  assert.equal(soloFoto.body.mensaje.texto, null);

  const disfrazado = await foto(base().field("texto", "mira"), FALSO, "foto.png", "image/png");
  assert.equal(disfrazado.status, 400);
  assert.match(disfrazado.body.error, /no es una imagen válida/);
  const html = await foto(base().field("texto", "mira"), FALSO, "pagina.html", "text/html");
  assert.equal(html.status, 400);

  const enorme = Buffer.concat([PNG, Buffer.alloc(5 * 1024 * 1024 + 10)]);
  assert.equal((await foto(base().field("texto", "mira"), enorme)).status, 400);

  const cuatro = base().field("texto", "muchas");
  for (let i = 0; i < 4; i += 1) foto(cuatro);
  assert.equal((await cuatro).status, 400);

  // lo rechazado no deja archivos huérfanos: solo quedó la única foto aceptada
  assert.equal(archivosPrivados().filter((f) => !antes.includes(f)).length, 1);
});

// ---------------- Leído y no leído ----------------
test("lo no leído se cuenta por persona, se marca al abrir la conversación y no incluye lo propio", async () => {
  const n = await negocio("Lectura");
  const turista = await registrar("turista");
  const id = (await preguntar(turista.token, { sitio_id: n.sitio.id, texto: "Uno" })).body.conversacion_id;
  await escribir(turista.token, id, "Dos");

  assert.deepEqual((await api("get", "/conversaciones/sin-leer").set(auth(n.cuenta.token))).body, { total: 2 });
  assert.deepEqual((await api("get", "/conversaciones/sin-leer").set(auth(turista.token))).body, { total: 0 });

  // consultar no marca como leído (puede ser un refresco automático); marcar es una acción aparte
  await api("get", `/conversaciones/${id}`).set(auth(n.cuenta.token));
  assert.equal((await api("get", "/conversaciones/sin-leer").set(auth(n.cuenta.token))).body.total, 2);
  assert.equal((await api("patch", `/conversaciones/${id}/leido`).set(auth(n.cuenta.token))).status, 204);
  assert.equal((await api("get", "/conversaciones/sin-leer").set(auth(n.cuenta.token))).body.total, 0);
  assert.equal((await api("get", "/conversaciones").set(auth(n.cuenta.token))).body[0].sin_leer, 0);

  await escribir(n.cuenta.token, id, "Respuesta");
  assert.equal((await api("get", "/conversaciones/sin-leer").set(auth(turista.token))).body.total, 1);
  assert.equal((await api("get", "/conversaciones/sin-leer").set(auth(n.cuenta.token))).body.total, 0); // lo suyo no cuenta
});

test("se pueden pedir solo los mensajes nuevos y las páginas anteriores de una conversación larga", async () => {
  const n = await negocio("Paginas");
  const turista = await registrar("turista");
  const id = (await preguntar(turista.token, { sitio_id: n.sitio.id, texto: "Primero" })).body.conversacion_id;
  await Mensaje.bulkCreate(Array.from({ length: 59 }, (_, i) => ({ conversacion_id: id, autor_id: turista.usuario.id, texto: `m${i + 2}` })));

  const reciente = (await api("get", `/conversaciones/${id}`).set(auth(turista.token))).body;
  assert.equal(reciente.mensajes.length, 50);
  assert.equal(reciente.hay_mas, true);
  assert.equal(reciente.mensajes.at(-1).texto, "m60"); // el último mensaje va al final

  const anteriores = (await api("get", `/conversaciones/${id}?antes=${reciente.mensajes[0].id}`).set(auth(turista.token))).body;
  assert.equal(anteriores.mensajes.length, 10);
  assert.equal(anteriores.hay_mas, false);
  assert.equal(anteriores.mensajes[0].texto, "Primero");

  const ultimoId = reciente.mensajes.at(-1).id;
  assert.equal((await api("get", `/conversaciones/${id}?despues=${ultimoId}`).set(auth(turista.token))).body.mensajes.length, 0);
  await escribir(n.cuenta.token, id, "Nuevo");
  const nuevos = (await api("get", `/conversaciones/${id}?despues=${ultimoId}`).set(auth(turista.token))).body.mensajes;
  assert.deepEqual(nuevos.map((m) => m.texto), ["Nuevo"]);
  assert.equal((await api("get", `/conversaciones/${id}?antes=abc`).set(auth(turista.token))).status, 200); // un valor inválido se ignora
});

// ---------------- Avisos ----------------
test("se avisa una vez por racha de mensajes, sin copiar el contenido del mensaje, y de nuevo después de leer", async () => {
  const n = await negocio("Avisos");
  const turista = await registrar("turista");
  const avisos = () => Notificacion.findAll({ where: { usuario_id: n.cuenta.usuario.id, tipo: "mensaje_nuevo" } });
  const id = (await preguntar(turista.token, { sitio_id: n.sitio.id, texto: "SECRETO-DE-LA-TURISTA primero" })).body.conversacion_id;
  await escribir(turista.token, id, "segundo");
  await escribir(turista.token, id, "tercero");
  const primera = await avisos();
  assert.equal(primera.length, 1);
  assert.ok(!primera[0].mensaje.includes("SECRETO-DE-LA-TURISTA"), "el aviso no debe llevar el contenido");
  assert.match(primera[0].mensaje, /Usuario Prueba te escribió/);

  await api("patch", `/conversaciones/${id}/leido`).set(auth(n.cuenta.token));
  await escribir(turista.token, id, "cuarto");
  assert.equal((await avisos()).length, 2);

  // y el negocio, al responder, avisa a la turista
  await escribir(n.cuenta.token, id, "Respuesta");
  const aLaTurista = await Notificacion.findAll({ where: { usuario_id: turista.usuario.id, tipo: "mensaje_nuevo" } });
  assert.equal(aLaTurista.length, 1);
  assert.match(aLaTurista[0].mensaje, new RegExp(`${n.perfil.nombre_negocio} te respondió`));
});

// ---------------- Topes contra abuso ----------------
test("hay un tope de mensajes por hora y de negocios nuevos por día, que no corta las conversaciones que ya existen", async () => {
  const n = await negocio("Topes");
  const turista = await registrar("turista");
  const id = (await preguntar(turista.token, { sitio_id: n.sitio.id, texto: "Uno" })).body.conversacion_id;

  await Mensaje.bulkCreate(Array.from({ length: MENSAJES_POR_HORA }, () => ({ conversacion_id: id, autor_id: turista.usuario.id, texto: "relleno" })));
  const exceso = await escribir(turista.token, id, "Uno de más");
  assert.equal(exceso.status, 429);
  assert.match(exceso.body.error, /muchos mensajes/);

  // negocios nuevos por día
  const otra = await registrar("turista");
  for (let i = 0; i < CONVERSACIONES_NUEVAS_POR_DIA; i += 1) {
    const x = await Prestador.create({ usuario_id: (await registrar("prestador")).usuario.id, nombre_negocio: `Relleno ${i}`, categoria: "Naturaleza", municipio: "Florencia", estado_verificacion: "aprobado" });
    await Conversacion.create({ turista_id: otra.usuario.id, prestador_id: x.id });
  }
  const nuevo = await preguntar(otra.token, { sitio_id: n.sitio.id, texto: "Uno más" });
  assert.equal(nuevo.status, 429);
  assert.match(nuevo.body.error, /varios negocios hoy/);
  // si ya hablaba con ese negocio, puede seguir
  await Conversacion.create({ turista_id: otra.usuario.id, prestador_id: n.perfil.id });
  assert.equal((await preguntar(otra.token, { sitio_id: n.sitio.id, texto: "Ya hablábamos" })).status, 201);
});

// ---------------- Reportes y moderación ----------------
test("quien participa puede reportar un mensaje ajeno; no el propio, ni dos veces, ni sin ser parte", async () => {
  const n = await negocio("Reporte");
  const turista = await registrar("turista");
  const tercero = await registrar("turista");
  const adm = await admin();
  const id = (await preguntar(turista.token, { sitio_id: n.sitio.id, texto: "Compra en mi página" })).body.conversacion_id;
  const mensajeId = (await Mensaje.findOne({ where: { conversacion_id: id } })).id;
  const reportar = (token, cuerpo = { motivo: "spam" }) => api("post", `/conversaciones/mensajes/${mensajeId}/reportar`).set(auth(token)).send(cuerpo);

  assert.equal((await reportar(turista.token)).status, 400); // el propio
  assert.equal((await reportar(tercero.token)).status, 404); // sin ser parte
  assert.equal((await reportar(n.cuenta.token, { motivo: "inventado" })).status, 400);
  const ok = await reportar(n.cuenta.token, { motivo: "contacto_externo", detalle: "Pide el número de tarjeta" });
  assert.equal(ok.status, 201);
  assert.equal((await reportar(n.cuenta.token)).status, 400); // ya lo reportó
  assert.equal(await ReporteMensaje.count({ where: { mensaje_id: mensajeId } }), 1);
  assert.ok((await Notificacion.count({ where: { usuario_id: adm.usuario.id, tipo: "mensaje_reportado" } })) >= 1);
});

test("la administración ve solo el mensaje reportado (con sus fotos) y puede descartarlo o retirarlo", async () => {
  const n = await negocio("Moderacion");
  const turista = await registrar("turista");
  const adm = await admin();
  const res = await foto(api("post", "/conversaciones").set(auth(turista.token)).field("sitio_id", n.sitio.id).field("texto", "Mensaje a revisar"));
  const mensajeId = res.body.mensaje.id;
  const imagenId = res.body.mensaje.imagenes[0].id;
  await escribir(n.cuenta.token, res.body.conversacion_id, "Otra cosa que nadie reportó");
  await api("post", `/conversaciones/mensajes/${mensajeId}/reportar`).set(auth(n.cuenta.token)).send({ motivo: "ofensivo" });

  const lista = (await api("get", "/admin/reportes-mensajes").set(auth(adm.token))).body;
  const reporte = lista.find((r) => r.mensaje.id === mensajeId);
  assert.ok(reporte);
  assert.equal(reporte.mensaje.texto, "Mensaje a revisar");
  assert.equal(reporte.mensaje.autor, "Usuario Prueba");
  assert.equal(reporte.mensaje.negocio, n.perfil.nombre_negocio);
  assert.ok(!JSON.stringify(lista).includes("Otra cosa que nadie reportó"), "no debe mostrar el resto de la conversación");
  assert.equal((await api("get", `/conversaciones/imagenes/${imagenId}`).set(auth(adm.token))).status, 200); // ahora sí, por estar reportada
  assert.equal((await api("get", "/admin/reportes-mensajes").set(auth(turista.token))).status, 403);

  const retirar = await api("patch", `/admin/reportes-mensajes/${reporte.id}`).set(auth(adm.token)).send({ accion: "retirar" });
  assert.equal(retirar.status, 200);
  assert.equal(retirar.body.estado, "retirado");
  const hilo = (await api("get", `/conversaciones/${res.body.conversacion_id}`).set(auth(n.cuenta.token))).body.mensajes.find((m) => m.id === mensajeId);
  assert.equal(hilo.retirado, true);
  assert.equal(hilo.texto, null);
  assert.deepEqual(hilo.imagenes, []);
  assert.equal((await api("get", `/conversaciones/imagenes/${imagenId}`).set(auth(turista.token))).status, 404); // ni su propia autora
  assert.ok(await Notificacion.findOne({ where: { usuario_id: turista.usuario.id, tipo: "mensaje_retirado" } }));
  assert.ok(await Auditoria.findOne({ where: { accion: "mensaje_retirado", entidad_id: mensajeId } }));
  assert.equal((await api("patch", `/admin/reportes-mensajes/${reporte.id}`).set(auth(adm.token)).send({ accion: "descartar" })).status, 400); // ya revisado
  assert.equal((await api("patch", `/admin/reportes-mensajes/${reporte.id}`).set(auth(adm.token)).send({ accion: "otra" })).status, 400);
});

test("descartar un reporte deja el mensaje como estaba", async () => {
  const n = await negocio("Descarte");
  const turista = await registrar("turista");
  const adm = await admin();
  const res = await preguntar(turista.token, { sitio_id: n.sitio.id, texto: "Pregunta normal" });
  await api("post", `/conversaciones/mensajes/${res.body.mensaje.id}/reportar`).set(auth(n.cuenta.token)).send({ motivo: "otro" });
  const reporte = (await api("get", "/admin/reportes-mensajes").set(auth(adm.token))).body.find((r) => r.mensaje.id === res.body.mensaje.id);
  assert.equal((await api("patch", `/admin/reportes-mensajes/${reporte.id}`).set(auth(adm.token)).send({ accion: "descartar" })).body.estado, "descartado");
  assert.equal((await Mensaje.findByPk(res.body.mensaje.id)).retirado, false);
  assert.ok(!(await api("get", "/admin/reportes-mensajes").set(auth(adm.token))).body.some((r) => r.id === reporte.id)); // ya no está pendiente
  assert.ok((await api("get", "/admin/reportes-mensajes?estado=descartado").set(auth(adm.token))).body.some((r) => r.id === reporte.id));
});

// ---------------- Datos personales ----------------
test("la descarga de datos incluye las conversaciones, y eliminar la cuenta borra mensajes, fotos y conversaciones", async () => {
  const n = await negocio("Datos");
  const turista = await registrar("turista");
  const antes = archivosPrivados();
  const res = await foto(api("post", "/conversaciones").set(auth(turista.token)).field("sitio_id", n.sitio.id).field("texto", "Dato personal que debe poder descargar"));
  assert.equal(res.status, 201);
  await escribir(n.cuenta.token, res.body.conversacion_id, "Respuesta del negocio");
  const archivo = archivosPrivados().find((f) => !antes.includes(f));
  assert.ok(archivo);

  const datos = (await api("get", "/auth/mis-datos").set(auth(turista.token))).body;
  assert.equal(datos.mensajes.length, 1);
  assert.equal(datos.mensajes[0].con, n.perfil.nombre_negocio);
  assert.deepEqual(datos.mensajes[0].mensajes.map((m) => [m.de, m.texto, m.fotos]), [["tú", "Dato personal que debe poder descargar", 1], ["la otra persona", "Respuesta del negocio", 0]]);
  assert.ok(!JSON.stringify(datos).includes(archivo), "no debe exponer el nombre del archivo en disco");

  const borrar = await api("delete", "/auth/cuenta").set(auth(turista.token)).send({ password: "clave12345" });
  assert.equal(borrar.status, 200, JSON.stringify(borrar.body));
  assert.equal(await Conversacion.count({ where: { turista_id: turista.usuario.id } }), 0);
  assert.equal(await Mensaje.count({ where: { conversacion_id: res.body.conversacion_id } }), 0);
  assert.equal(await MensajeImagen.count({ where: { mensaje_id: res.body.mensaje.id } }), 0);
  await new Promise((r) => setTimeout(r, 100)); // el borrado del archivo es en segundo plano
  assert.ok(!archivosPrivados().includes(archivo), "la foto debe desaparecer del disco");
  assert.equal((await api("get", "/conversaciones").set(auth(n.cuenta.token))).body.length, 0); // el negocio ya no la tiene
});

test("al eliminar la cuenta de un negocio también se borran sus conversaciones", async () => {
  const n = await negocio("Cierra");
  const turista = await registrar("turista");
  await preguntar(turista.token, { sitio_id: n.sitio.id, texto: "Hola" });
  assert.equal(await Conversacion.count({ where: { prestador_id: n.perfil.id } }), 1);
  const borrar = await api("delete", "/auth/cuenta").set(auth(n.cuenta.token)).send({ password: "clave12345" });
  assert.equal(borrar.status, 200, JSON.stringify(borrar.body));
  assert.equal(await Conversacion.count({ where: { prestador_id: n.perfil.id } }), 0);
  assert.equal((await api("get", "/conversaciones").set(auth(turista.token))).body.length, 0);
});

// ---------------- Las políticas, una por una ----------------
test("política de mensajes: partes, quién abre, quién responde, quién ve fotos y quién reporta", () => {
  const p = politicas.mensajes;
  const turista = { id: 1, rol: "turista" };
  const dueno = { id: 2, rol: "prestador" };
  const otro = { id: 3, rol: "turista" };
  const adm = { id: 9, rol: "administrador" };
  const conversacion = { turista_id: 1 };
  const negocioDe2 = { id: 20, usuario_id: 2 };

  assert.equal(p.esParticipante(turista, conversacion, negocioDe2), true);
  assert.equal(p.esParticipante(dueno, conversacion, negocioDe2), true);
  assert.equal(p.esParticipante(otro, conversacion, negocioDe2), false);
  assert.equal(p.esParticipante(adm, conversacion, negocioDe2), false); // la administración no lee conversaciones
  assert.equal(p.esParticipante(turista, conversacion, null), true);

  assert.equal(p.puedeEscribirANegocio(turista, negocioDe2), true);
  assert.equal(p.puedeEscribirANegocio({ id: 5, rol: "prestador" }, negocioDe2), true); // un negocio pregunta a otro como una turista
  assert.equal(p.puedeEscribirANegocio(dueno, negocioDe2), false); // a su propio negocio, no
  assert.equal(p.puedeEscribirANegocio(adm, negocioDe2), false);
  assert.equal(p.puedeEscribirANegocio(turista, null), false);

  assert.equal(p.puedeEscribirEnConversacion(turista, conversacion, negocioDe2, { turistaYaEscribio: false }), true);
  assert.equal(p.puedeEscribirEnConversacion(dueno, conversacion, negocioDe2, { turistaYaEscribio: false }), false); // el negocio solo responde
  assert.equal(p.puedeEscribirEnConversacion(dueno, conversacion, negocioDe2, { turistaYaEscribio: true }), true);
  assert.equal(p.puedeEscribirEnConversacion(otro, conversacion, negocioDe2, { turistaYaEscribio: true }), false);

  assert.equal(p.puedeVerImagenMensaje(turista, { participante: true, retirado: false, reportado: false }), true);
  assert.equal(p.puedeVerImagenMensaje(turista, { participante: true, retirado: true, reportado: true }), false); // retirada: ni su autora
  assert.equal(p.puedeVerImagenMensaje(otro, { participante: false, retirado: false, reportado: true }), false);
  assert.equal(p.puedeVerImagenMensaje(adm, { participante: false, retirado: false, reportado: false }), false);
  assert.equal(p.puedeVerImagenMensaje(adm, { participante: false, retirado: false, reportado: true }), true); // solo de mensajes reportados
  assert.equal(p.puedeVerImagenMensaje(adm, { participante: false, retirado: true, reportado: true }), true);

  assert.equal(p.puedeReportarMensaje(dueno, { autor_id: 1, retirado: false }, true), true);
  assert.equal(p.puedeReportarMensaje(turista, { autor_id: 1, retirado: false }, true), false); // el propio
  assert.equal(p.puedeReportarMensaje(otro, { autor_id: 1, retirado: false }, false), false);
  assert.equal(p.puedeReportarMensaje(dueno, { autor_id: 1, retirado: true }, true), false); // ya retirado
});
