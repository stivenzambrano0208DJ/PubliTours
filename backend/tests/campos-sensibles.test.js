const test = require("node:test");
const assert = require("node:assert/strict");
const { request, app, sequelize, auth } = require("./helpers");
const { crearMundo, limpiarMundo, enDias } = require("./mundo");
const { listarRutas } = require("./inventario-rutas");

test.after(async () => { limpiarMundo(); await sequelize.close(); });

// Recorre TODAS las rutas GET de la API con cada tipo de persona (anónima, de otra cuenta, dueña de los datos y administradora)
// y revisa lo que devuelven. Una respuesta nueva que filtre un campo interno (por un `include` descuidado, por ejemplo) hace fallar
// esta prueba aunque nadie la haya escrito pensando en ese campo.
let m;
let respuestas; // { identidad: [{ ruta, estado, cuerpo, texto }] }
const CAMPOS_PROHIBIDOS_PARA_TODOS = ["password_hash", "token_hash", "token_version", "codigo_hash"];
// Datos internos que solo ven su dueño o el administrador. Lo que cualquier otra persona recibe no debe incluirlos.
const CAMPOS_PRIVADOS = [
  "motivo_moderacion", "motivo_rechazo", "token_publico", "correo", "turista_id", "usuario_id", "eliminado_en",
  "correo_verificado", "acepto_terminos_en", "version_terminos", "fecha_registro", "comision", "comision_pct", "nota", "cierre_automatico",
];
// Rutas que devuelven los datos de quien pregunta: ahí un campo "privado" es suyo y es normal verlo.
// Lo que sí es público a propósito aunque se parezca a un dato interno: las reglas del negocio que ya publican los términos.
const PERMITIDOS_EN_RUTA = { "/configuracion": ["comision_pct"] };
const RUTAS_PROPIAS = /^\/(prestadores\/me|usuarios\/me|auth\/mis-datos|notificaciones|favoritos|reservas\/(mias|recibidas)|itinerarios$|paquetes\/mios|admin|estadisticas|prestadores$|prestadores\/pendientes|conversaciones)/;

const resolver = (patron) => {
  const ids = [
    [/^\/sitios\/:id/, m.A.sitios[0].id], [/^\/paquetes\/:id/, m.A.paquete.id], [/^\/reservas\/:id$/, m.reservaConfirmada.id],
    [/^\/itinerarios\/:id$/, m.itinerario.id], [/^\/prestadores\/:id/, m.A.negocio.id],
    [/^\/conversaciones\/imagenes\/:imagenId$/, m.imagen.id], [/^\/conversaciones\/:id$/, m.conversacion.id],
  ];
  let ruta = patron;
  for (const [re, valor] of ids) if (re.test(patron)) { ruta = ruta.replace(":id", valor).replace(":imagenId", valor); break; }
  ruta = ruta.replace(":codigo", m.reservaConfirmada.codigo).replace(":token", m.tokenCompartido).replace(/:\w+/g, "1");
  if (ruta.endsWith("/cotizar")) ruta += `?personas=2&fecha=${enDias(15)}`;
  return ruta.replace(/\/$/, "") || "/";
};

const claves = (valor, acumulado = new Set()) => {
  if (Array.isArray(valor)) valor.forEach((v) => claves(v, acumulado));
  else if (valor && typeof valor === "object") for (const [k, v] of Object.entries(valor)) { acumulado.add(k); claves(v, acumulado); }
  return acumulado;
};

test.before(async () => {
  m = await crearMundo();
  const identidades = {
    anonima: null,
    "otro turista": m.turistaB.token,
    "otro negocio": m.B.cuenta.token,
    "turista dueña": m.turistaA.token,
    "negocio dueño": m.A.cuenta.token,
    administradora: m.admin.token,
  };
  const gets = listarRutas(app).filter((r) => r.metodo === "GET").map((r) => r.ruta.replace("/api/v1", "").replace(/[/]$/, "") || "/");
  respuestas = {};
  for (const [nombre, token] of Object.entries(identidades)) {
    respuestas[nombre] = [];
    for (const patron of gets) {
      const url = resolver(patron);
      const res = await (token ? request(app).get(`/api/v1${url}`).set(auth(token)) : request(app).get(`/api/v1${url}`));
      respuestas[nombre].push({ patron, url, estado: res.status, cuerpo: res.body, texto: res.text || "" });
    }
  }
});

test("la prueba revisa de verdad: hay muchas respuestas con contenido para cada tipo de persona", () => {
  const conDatos = (nombre) => respuestas[nombre].filter((r) => r.estado === 200 && r.texto.length > 2).length;
  assert.ok(conDatos("anonima") >= 12, `solo ${conDatos("anonima")} respuestas públicas con datos`);
  assert.ok(conDatos("turista dueña") >= 20, `solo ${conDatos("turista dueña")} respuestas de la turista con datos`);
  assert.ok(conDatos("negocio dueño") >= 20, `solo ${conDatos("negocio dueño")} respuestas del negocio con datos`);
  assert.ok(conDatos("administradora") >= 25, `solo ${conDatos("administradora")} respuestas de la administradora con datos`);
  for (const [nombre, lista] of Object.entries(respuestas)) assert.ok(!lista.some((r) => r.estado >= 500), `${nombre}: una ruta dio error 500`);
});

test("NINGUNA respuesta, para nadie, incluye hashes de contraseña, versiones de sesión ni tokens", () => {
  const hash = /\$2[aby]\$\d\d\$[./A-Za-z0-9]{53}/;
  const jwt = /eyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{5,}/;
  for (const [nombre, lista] of Object.entries(respuestas)) {
    for (const r of lista) {
      const prohibidas = CAMPOS_PROHIBIDOS_PARA_TODOS.filter((c) => claves(r.cuerpo).has(c));
      assert.deepEqual(prohibidas, [], `${nombre} · GET ${r.url} devolvió ${prohibidas.join(", ")}`);
      assert.ok(!hash.test(r.texto), `${nombre} · GET ${r.url} devolvió un hash de contraseña`);
      assert.ok(!jwt.test(r.texto), `${nombre} · GET ${r.url} devolvió un token`);
    }
  }
});

test("quien no es dueño de los datos (anónimo, otra cuenta) no recibe campos internos ni datos personales ajenos", () => {
  const personales = [m.turistaA.correo, m.turistaB.correo, m.A.cuenta.correo, m.B.cuenta.correo, m.admin.correo, "Mensaje privado de A", m.tokenCompartido];
  for (const nombre of ["anonima", "otro turista", "otro negocio"]) {
    for (const r of respuestas[nombre].filter((x) => !RUTAS_PROPIAS.test(x.patron) && x.estado === 200)) {
      const filtrados = CAMPOS_PRIVADOS.filter((c) => claves(r.cuerpo).has(c) && !PERMITIDOS_EN_RUTA[r.patron]?.includes(c));
      assert.deepEqual(filtrados, [], `${nombre} · GET ${r.url} devolvió campos internos: ${filtrados.join(", ")}`);
      const ajenos = personales.filter((p) => r.texto.includes(p));
      assert.deepEqual(ajenos, [], `${nombre} · GET ${r.url} devolvió datos personales ajenos: ${ajenos.join(", ")}`);
    }
  }
});

test("las rutas que dependen de los datos de otra cuenta responden con un error, no con los datos", () => {
  for (const nombre of ["anonima", "otro turista", "otro negocio"]) {
    for (const patron of ["/reservas/:id", "/itinerarios/:id"]) {
      const r = respuestas[nombre].find((x) => x.patron === patron);
      assert.ok(r.estado >= 400 && r.estado < 500, `${nombre} · GET ${patron} respondió ${r.estado}`);
    }
  }
});

// ---- Lista blanca: las respuestas más sensibles tienen EXACTAMENTE estos campos, ni uno más ----
const exactos = (obj) => Object.keys(obj).sort();
const buscar = (nombre, patron) => respuestas[nombre].find((r) => r.patron === patron);

test("lista blanca: la verificación pública de un comprobante solo muestra lo mínimo", () => {
  const r = buscar("anonima", "/reservas/verificar/:codigo");
  assert.equal(r.estado, 200);
  assert.deepEqual(exactos(r.cuerpo), ["codigo", "estado", "fecha_servicio", "personas", "servicio", "titular"]);
  assert.match(r.cuerpo.titular, /^Usuario P\.$/); // nombre abreviado, no el completo
});

test("lista blanca: el itinerario compartido no incluye a su dueño, su presupuesto ni identificadores internos", () => {
  const r = buscar("anonima", "/itinerarios/compartido/:token");
  assert.equal(r.estado, 200);
  assert.deepEqual(exactos(r.cuerpo), ["dias", "fecha_inicio", "items", "personas"]);
  assert.deepEqual(exactos(r.cuerpo.items[0]), ["dia", "id", "justificacion", "orden", "sitio"]);
  assert.deepEqual(exactos(r.cuerpo.items[0].sitio), ["categoria", "descripcion", "id", "imagen_url", "latitud", "longitud", "municipio", "nombre", "precio"]);
});

test("lista blanca: la configuración pública y el perfil propio solo tienen los campos previstos", () => {
  assert.deepEqual(exactos(buscar("anonima", "/configuracion").cuerpo), ["comision_pct", "dias_gracia_asistencia", "mensajeria", "politicas_cancelacion"]);
  const yo = buscar("turista dueña", "/usuarios/me");
  assert.equal(yo.estado, 200);
  assert.deepEqual(exactos(yo.cuerpo), ["correo", "correo_verificado", "fecha_registro", "id", "nombre", "rol"]);
});

test("lista blanca: iniciar sesión y registrarse devuelven solo los datos básicos de la cuenta", async () => {
  const WEB = { "X-Requested-With": "PubliTours" };
  const login = await request(app).post("/api/v1/auth/login").set(WEB).send({ correo: m.turistaA.correo, password: "clave12345" });
  assert.equal(login.status, 200);
  assert.deepEqual(exactos(login.body), ["usuario"]); // la aplicación web no recibe el token: va en la cookie
  assert.deepEqual(exactos(login.body.usuario), ["correo", "correo_verificado", "id", "nombre", "rol"]);

  const registro = await request(app).post("/api/v1/auth/registro").set(WEB)
    .send({ nombre: "Nueva Persona", correo: `nueva${Date.now()}@test.com`, password: "clave12345", rol: "turista", acepta_terminos: true });
  assert.equal(registro.status, 201);
  assert.deepEqual(exactos(registro.body.usuario), ["correo", "correo_verificado", "id", "nombre", "rol"]);
});

test("el administrador ve datos internos de moderación, pero tampoco hashes ni versiones de sesión", () => {
  const usuarios = buscar("administradora", "/admin/usuarios");
  assert.equal(usuarios.estado, 200);
  assert.ok(usuarios.cuerpo.length > 0);
  assert.deepEqual([...claves(usuarios.cuerpo)].filter((c) => CAMPOS_PROHIBIDOS_PARA_TODOS.includes(c)), []);
});

// ---- El motivo interno de una moderación no sale por NINGUNA ruta hacia quien no es su dueño ni administrador ----
test("el motivo con que el administrador oculta un servicio solo lo ven su negocio y la administración", async () => {
  const SECRETO = "MOTIVO-INTERNO-DE-MODERACION-7731";
  const sitio = m.A.sitios[0];
  const ocultar = await request(app).patch(`/api/v1/admin/sitios/${sitio.id}/estado`).set(auth(m.admin.token)).send({ estado: "oculto", motivo: SECRETO });
  assert.equal(ocultar.status, 200);

  const rutas = [
    "/reservas/mias", `/reservas/${m.reservaConfirmada.id}`, "/itinerarios", `/itinerarios/${m.itinerario.id}`, "/favoritos", "/notificaciones",
    "/sitios", `/sitios/${sitio.id}`, "/paquetes", `/paquetes/${m.A.paquete.id}`, `/prestadores/${m.A.negocio.id}/publico`, `/itinerarios/compartido/${m.tokenCompartido}`,
  ];
  const cuentas = { "turista dueña de la reserva": m.turistaA.token, "otro turista": m.turistaB.token, "otro negocio": m.B.cuenta.token, "anónima": null };
  for (const [nombre, token] of Object.entries(cuentas)) {
    for (const ruta of rutas) {
      const res = await (token ? request(app).get(`/api/v1${ruta}`).set(auth(token)) : request(app).get(`/api/v1${ruta}`));
      assert.ok(!res.text.includes(SECRETO), `${nombre} · GET ${ruta} reveló el motivo interno de moderación`);
    }
  }
  // controles positivos: sin esto la prueba podría pasar por no estar mirando nada
  const dueno = await request(app).get("/api/v1/prestadores/me/sitios").set(auth(m.A.cuenta.token));
  assert.ok(dueno.text.includes(SECRETO), "el negocio dueño debe seguir viendo por qué ocultaron su servicio");
  const admin = await request(app).get("/api/v1/admin/sitios").set(auth(m.admin.token));
  assert.ok(admin.text.includes(SECRETO), "la administración debe seguir viendo el motivo");
});

// ---- Mensajería ----
test("las conversaciones ajenas dan un error a quien no participa, y las propias nunca llevan datos de cuenta de la otra persona", () => {
  for (const nombre of ["anonima", "otro turista", "otro negocio"]) {
    for (const patron of ["/conversaciones/:id", "/conversaciones/imagenes/:imagenId"]) {
      const r = respuestas[nombre].find((x) => x.patron === patron);
      assert.ok(r.estado >= 400 && r.estado < 500, `${nombre} · GET ${patron} respondió ${r.estado}`);
      assert.ok(!r.texto.includes("Mensaje privado de la conversación de A"), `${nombre} · GET ${patron} reveló el mensaje`);
    }
  }
  // La administración no lee conversaciones
  assert.equal(buscar("administradora", "/conversaciones/:id").estado, 403);
  // Quienes participan ven la conversación sin correos, ni ids de cuenta, ni nombres de archivo del disco
  for (const nombre of ["turista dueña", "negocio dueño"]) {
    const hilo = buscar(nombre, "/conversaciones/:id");
    assert.equal(hilo.estado, 200, nombre);
    assert.ok(hilo.texto.includes("Mensaje privado de la conversación de A"));
    const prohibidos = ["correo", "turista_id", "usuario_id", "autor_id", "archivo", "prestador_id", "token_publico"].filter((k) => claves(hilo.cuerpo).has(k));
    assert.deepEqual(prohibidos, [], `${nombre}: la conversación devolvió ${prohibidos.join(", ")}`);
    assert.ok(!hilo.texto.includes(".png"), `${nombre}: no debe mostrar el nombre del archivo en el disco`);
    const lista = buscar(nombre, "/conversaciones");
    assert.equal(lista.estado, 200);
    assert.ok(!["correo", "turista_id", "usuario_id", "prestador_id"].some((k) => claves(lista.cuerpo).has(k)), `${nombre}: la lista devolvió datos de cuenta`);
  }
});

test("lista blanca: una conversación, un mensaje y la lista de conversaciones tienen exactamente los campos previstos", () => {
  const hilo = buscar("turista dueña", "/conversaciones/:id").cuerpo;
  assert.deepEqual(exactos(hilo), ["contraparte", "hay_mas", "id", "lado", "mensajes", "puede_escribir"]);
  assert.deepEqual(exactos(hilo.contraparte), ["nombre"]);
  assert.deepEqual(exactos(hilo.mensajes[0]), ["contexto", "creado_en", "de", "id", "imagenes", "mio", "retirado", "texto"]);
  assert.deepEqual(exactos(hilo.mensajes[0].contexto), ["id", "nombre", "tipo"]);
  assert.deepEqual(exactos(hilo.mensajes[0].imagenes[0]), ["id"]);
  const lista = buscar("negocio dueño", "/conversaciones").cuerpo;
  assert.deepEqual(exactos(lista[0]), ["contraparte", "id", "lado", "sin_leer", "ultimo", "ultimo_mensaje_en"]);
  assert.deepEqual(exactos(lista[0].ultimo), ["con_fotos", "creado_en", "de", "mio", "retirado", "texto"]);
  assert.deepEqual(exactos(buscar("turista dueña", "/conversaciones/sin-leer").cuerpo), ["total"]);
});
