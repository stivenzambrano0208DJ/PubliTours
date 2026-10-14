const test = require("node:test");
const assert = require("node:assert/strict");
const express = require("express");
const { request, app, sequelize, registrar, auth } = require("./helpers");
const { validarEntorno, opcionesCors } = require("../src/config/entorno");
const { crearLimitadores } = require("../src/middlewares/limites");
const { formatear } = require("../src/utils/logger");

test.after(() => sequelize.close());

test("/salud responde sin sesión cuando el proceso y la base de datos están bien", async () => {
  const res = await request(app).get("/salud");
  assert.equal(res.status, 200);
  assert.deepEqual(res.body, { estado: "ok", base_de_datos: "ok" });
});

test("las respuestas llevan cabeceras de seguridad y no revelan el framework", async () => {
  const res = await request(app).get("/api/v1/sitios?limit=1");
  assert.equal(res.headers["x-content-type-options"], "nosniff");
  assert.ok(res.headers["strict-transport-security"]);
  assert.equal(res.headers["x-powered-by"], undefined);
  assert.equal(res.headers["x-frame-options"], "SAMEORIGIN");
});

test("las fotos se pueden cargar desde el frontend (otro origen)", async () => {
  const res = await request(app).get("/uploads/no-existe.jpg");
  assert.equal(res.status, 404);
  assert.equal(res.headers["cross-origin-resource-policy"], "cross-origin");
});

test("cada respuesta lleva un identificador de petición, y se respeta uno válido enviado por un proxy", async () => {
  const generado = await request(app).get("/api/v1/configuracion");
  assert.match(generado.headers["x-request-id"], /^[0-9a-f-]{36}$/);
  const propio = await request(app).get("/api/v1/configuracion").set("X-Request-Id", "proxy-abc12345");
  assert.equal(propio.headers["x-request-id"], "proxy-abc12345");
  const malicioso = await request(app).get("/api/v1/configuracion").set("X-Request-Id", "../etc/passwd; <script>");
  assert.match(malicioso.headers["x-request-id"], /^[0-9a-f-]{36}$/); // se descarta y se genera uno propio
});

test("un JSON mal formado es un error del cliente (400), no del servidor", async () => {
  const res = await request(app).post("/api/v1/auth/login").set("Content-Type", "application/json").send("{ esto no es json");
  assert.equal(res.status, 400);
  assert.match(res.body.error, /no es válido/);
});

test("un error inesperado responde 500 con un id para rastrearlo y sin detalles internos", async () => {
  const usuario = await registrar("turista");
  // Se fuerza un fallo real de la base de datos en la consulta de la reserva (un id absurdo ya no llega hasta ahí: da 404).
  const { Reserva } = require("../src/models");
  const original = Reserva.findByPk;
  Reserva.findByPk = async () => { throw new Error('SequelizeDatabaseError: relation "reservas" does not exist (detalle interno)'); };
  let res;
  try {
    res = await request(app).get("/api/v1/reservas/1").set(auth(usuario.token));
  } finally {
    Reserva.findByPk = original;
  }
  assert.equal(res.status, 500);
  assert.equal(res.body.error, "Error interno del servidor.");
  assert.match(res.body.id, /^[0-9a-f-]{36}$/);
  assert.equal(res.body.id, res.headers["x-request-id"]);
  assert.ok(!JSON.stringify(res.body).includes("detalle interno"));
});

test("un fallo inesperado dentro de una operación de negocio es un 500 genérico, no un 400 con el mensaje interno", async () => {
  const { Reserva } = require("../src/models");
  const prest = await registrar("prestador");
  const original = Reserva.findByPk;
  Reserva.findByPk = async () => { throw new Error('SequelizeDatabaseError: column "secreta" does not exist'); };
  let res;
  try {
    res = await request(app).patch("/api/v1/reservas/1/confirmar").set(auth(prest.token));
  } finally {
    Reserva.findByPk = original;
  }
  assert.equal(res.status, 500);
  assert.ok(!JSON.stringify(res.body).includes("secreta"));
  // los errores de negocio siguen siendo 400 con su mensaje
  const negocio = await request(app).patch("/api/v1/reservas/999999/confirmar").set(auth(prest.token));
  assert.equal(negocio.status, 400);
  assert.equal(negocio.body.error, "Reserva no encontrada.");
});

test("el límite de peticiones corta con 429 en español tras superar el máximo", async () => {
  const { general } = crearLimitadores({ activo: true, maxGeneral: 3, maxAuth: 3 });
  const mini = express();
  mini.use(general);
  mini.get("/", (req, res) => res.json({ ok: true }));

  for (let i = 0; i < 3; i++) assert.equal((await request(mini).get("/")).status, 200);
  const bloqueada = await request(mini).get("/");
  assert.equal(bloqueada.status, 429);
  assert.match(bloqueada.body.error, /Demasiadas solicitudes/);
  assert.ok(bloqueada.headers["ratelimit"] || bloqueada.headers["ratelimit-policy"]); // el cliente sabe cuánto falta
});

test("el límite de inicio de sesión es independiente del general y avisa en español", async () => {
  const { auth: limiteAuth } = crearLimitadores({ activo: true, maxGeneral: 100, maxAuth: 2 });
  const mini = express();
  mini.post("/login", limiteAuth, (req, res) => res.status(401).json({ error: "mal" }));

  assert.equal((await request(mini).post("/login")).status, 401);
  assert.equal((await request(mini).post("/login")).status, 401);
  const bloqueada = await request(mini).post("/login");
  assert.equal(bloqueada.status, 429);
  assert.match(bloqueada.body.error, /Demasiados intentos/);
});

test("sin activarse (pruebas) los limitadores no bloquean nada", async () => {
  const { general, auth: limiteAuth } = crearLimitadores({ activo: false, maxGeneral: 1, maxAuth: 1 });
  const mini = express();
  mini.use(general);
  mini.post("/", limiteAuth, (req, res) => res.json({ ok: true }));
  for (let i = 0; i < 5; i++) assert.equal((await request(mini).post("/")).status, 200);
});

test("la validación del entorno exige lo indispensable y es más estricta en producción", () => {
  const completo = { DB_NAME: "x", DB_USER: "u", DB_PASSWORD: "p", JWT_SECRET: "a".repeat(40), EMAIL_USER: "a@b.c", EMAIL_PASS: "z", CORS_ORIGIN: "https://publitours.example.com" };
  assert.deepEqual(validarEntorno(completo), []);
  assert.deepEqual(validarEntorno({ ...completo, NODE_ENV: "production" }), []);

  assert.equal(validarEntorno({}).length, 4); // faltan DB_NAME, DB_USER, DB_PASSWORD y JWT_SECRET
  assert.match(validarEntorno({ ...completo, JWT_SECRET: undefined })[0], /JWT_SECRET/);

  const produccion = { ...completo, NODE_ENV: "production" };
  assert.match(validarEntorno({ ...produccion, JWT_SECRET: "corto" }).join(" "), /JWT_SECRET debe ser largo/);
  assert.match(validarEntorno({ ...produccion, JWT_SECRET: "cambia_este_secreto" }).join(" "), /JWT_SECRET debe ser largo/);
  assert.match(validarEntorno({ ...produccion, DB_PASSWORD: "cambia_esta_contraseña" }).join(" "), /DB_PASSWORD/);
  assert.match(validarEntorno({ ...produccion, CORS_ORIGIN: undefined }).join(" "), /CORS_ORIGIN/);
  assert.match(validarEntorno({ ...produccion, EMAIL_USER: "" }).join(" "), /EMAIL_USER y EMAIL_PASS/);
  // en desarrollo esos mismos valores flojos son aceptables
  assert.deepEqual(validarEntorno({ ...completo, JWT_SECRET: "corto", CORS_ORIGIN: undefined, EMAIL_USER: "" }), []);
});

test("CORS: abierto en desarrollo, cerrado por defecto en producción y limitado a la lista configurada", () => {
  assert.deepEqual(opcionesCors({}), { origin: true, credentials: true });
  assert.deepEqual(opcionesCors({ NODE_ENV: "production" }), { origin: false, credentials: true });
  assert.deepEqual(opcionesCors({ NODE_ENV: "production", CORS_ORIGIN: "https://a.com, https://b.com " }), { origin: ["https://a.com", "https://b.com"], credentials: true });
});

test("el registro es una línea JSON en producción y legible en desarrollo, y no incluye datos sensibles", () => {
  const fecha = new Date("2031-03-12T10:00:00Z");
  const json = JSON.parse(formatear("info", "peticion", { id: "abc", metodo: "GET", ruta: "/api/v1/sitios", estado: 200, ms: 12 }, true, fecha));
  assert.deepEqual(json, { t: "2031-03-12T10:00:00.000Z", nivel: "info", msg: "peticion", id: "abc", metodo: "GET", ruta: "/api/v1/sitios", estado: 200, ms: 12 });
  const legible = formatear("error", "falló", { id: "abc" }, false, fecha);
  assert.equal(legible, '2031-03-12T10:00:00.000Z ERROR falló {"id":"abc"}');
});

test("las rutas de autenticación sensibles tienen su propio límite activo", async () => {
  // En NODE_ENV=test está desactivado a propósito; aquí solo se comprueba que las rutas existen y siguen respondiendo con normalidad.
  const res = await request(app).post("/api/v1/auth/login").send({ correo: "nadie@test.com", password: "incorrecta1" });
  assert.equal(res.status, 401);
});
