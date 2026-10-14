const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const { request, app, sequelize, registrar, auth } = require("./helpers");
const { Usuario } = require("../src/models");
const { listarRutas, etiqueta } = require("./inventario-rutas");
const { MATRIZ, MOTIVO_PUBLICA } = require("./matriz-permisos");

test.after(() => sequelize.close());

// ---- La matriz real, leída del código ----
const claveDe = (r) => `${r.metodo} ${r.ruta.replace("/api/v1", "").replace(/\/$/, "") || "/"}`;
const reales = listarRutas(app).map((r) => ({ ...r, clave: claveDe(r), permiso: etiqueta(r) }));
const rutaConParametros = (clave) => clave.split(" ")[1].replace(/:\w+/g, "1"); // los ids de prueba no existen: solo importa quién puede pasar
const llamar = (clave, token) => {
  const [metodo] = clave.split(" ");
  const peticion = request(app)[metodo.toLowerCase()](`/api/v1${rutaConParametros(clave)}`);
  return token ? peticion.set(auth(token)) : peticion;
};

test("la matriz de permisos documentada coincide, ruta por ruta, con la protección real del código", () => {
  const esperadas = Object.entries(MATRIZ);
  const real = Object.fromEntries(reales.map((r) => [r.clave, r.permiso]));
  const nuevas = Object.keys(real).filter((c) => !(c in MATRIZ)).map((c) => `  + ${c}  →  ${real[c]}`);
  const quitadas = Object.keys(MATRIZ).filter((c) => !(c in real)).map((c) => `  - ${c}`);
  const cambiadas = esperadas.filter(([c, p]) => c in real && real[c] !== p).map(([c, p]) => `  ~ ${c}: documentado "${p}", pero el código dice "${real[c]}"`);
  const diferencias = [...nuevas, ...quitadas, ...cambiadas];
  assert.equal(diferencias.length, 0,
    `La protección de las rutas cambió. Si es intencional, actualiza tests/matriz-permisos.js; si no, es un hueco de seguridad:\n${diferencias.join("\n")}`);
});

test("toda ruta pública está justificada, y no hay justificaciones de rutas que ya no son públicas", () => {
  const publicas = reales.filter((r) => r.permiso === "pública").map((r) => r.clave).sort();
  assert.deepEqual(publicas, Object.keys(MOTIVO_PUBLICA).sort());
});

test("regla de producto: todo lo que está bajo /admin exige el rol administrador (y solo ese)", () => {
  const admin = reales.filter((x) => x.ruta.startsWith("/api/v1/admin"));
  assert.ok(admin.length >= 10);
  for (const r of admin) assert.equal(r.permiso, "administrador", r.clave);
});

// ---- Ataques a cada ruta protegida ----
const protegidas = reales.filter((r) => r.sesion);

test("sin sesión, TODAS las rutas protegidas responden 401 (no 400, 404 ni 500 que delaten algo)", async () => {
  for (const r of protegidas) {
    const res = await llamar(r.clave);
    assert.equal(res.status, 401, `${r.clave} respondió ${res.status} sin sesión`);
  }
});

test("con un token falso, vencido o manipulado, TODAS las rutas protegidas responden 401", async () => {
  const falsos = ["basura", "eyJhbGciOiJIUzI1NiJ9.eyJpZCI6MX0.firma-falsa", ""];
  for (const r of protegidas) {
    for (const token of falsos) {
      const res = await llamar(r.clave).set("Authorization", `Bearer ${token}`);
      assert.equal(res.status, 401, `${r.clave} con token "${token.slice(0, 12)}" respondió ${res.status}`);
    }
    // Con cookie el navegador no puede cambiar datos sin la cabecera de la aplicación (defensa CSRF): primero 403, y con la cabecera, 401.
    const cambiaDatos = r.metodo !== "GET";
    const conCookie = await llamar(r.clave).set("Cookie", "publitours_sesion=basura");
    assert.equal(conCookie.status, cambiaDatos ? 403 : 401, `${r.clave} con cookie falsa y sin la cabecera respondió ${conCookie.status}`);
    if (cambiaDatos) {
      const conCabecera = await llamar(r.clave).set("Cookie", "publitours_sesion=basura").set("X-Requested-With", "PubliTours");
      assert.equal(conCabecera.status, 401, `${r.clave} con cookie falsa y la cabecera respondió ${conCabecera.status}`);
    }
  }
});

test("una persona con el rol equivocado recibe 403 en cada ruta restringida", async () => {
  const cuentas = {
    turista: await registrar("turista"),
    prestador: await registrar("prestador"),
    administrador: await registrar("turista"),
  };
  await Usuario.update({ rol: "administrador" }, { where: { id: cuentas.administrador.usuario.id } });

  let comprobadas = 0;
  for (const r of protegidas.filter((x) => x.roles)) {
    for (const [rol, cuenta] of Object.entries(cuentas)) {
      if (r.roles.includes(rol)) continue;
      const res = await llamar(r.clave, cuenta.token);
      assert.equal(res.status, 403, `${r.clave} (solo ${r.roles.join("|")}) respondió ${res.status} a un ${rol}`);
      comprobadas += 1;
    }
  }
  assert.ok(comprobadas > 80, `se esperaban muchas comprobaciones y hubo ${comprobadas}`);
});

test("las acciones que exigen correo verificado lo exigen de verdad (403 con su código)", async () => {
  const sinVerificar = {
    turista: await registrar("turista", { verificado: false }),
    prestador: await registrar("prestador", { verificado: false }),
  };
  const exigentes = protegidas.filter((r) => r.correo);
  assert.ok(exigentes.length >= 4, `se esperaban al menos 4 rutas que exijan correo verificado y hay ${exigentes.length}`);
  for (const r of exigentes) {
    const rol = r.roles.find((x) => x !== "administrador");
    const res = await llamar(r.clave, sinVerificar[rol].token);
    assert.equal(res.status, 403, `${r.clave} dejó pasar a un ${rol} sin verificar (${res.status})`);
    assert.equal(res.body.codigo, "CORREO_NO_VERIFICADO", r.clave);
  }
});

// Un PNG válido de 1×1: si una ruta con subida recibiera el archivo antes de comprobar la sesión, quedaría guardado en el disco.
const PNG = Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR4nGP4z8DwHwAFAAH/q842iQAAAABJRU5ErkJggg==", "base64");
const archivosEnUploads = () => {
  const raiz = path.join(__dirname, "..", "public", "uploads");
  const recorrer = (d) => (fs.existsSync(d) ? fs.readdirSync(d, { withFileTypes: true }).flatMap((e) => (e.isDirectory() ? recorrer(path.join(d, e.name)) : [e.name])) : []);
  return recorrer(raiz).sort();
};

test("sin sesión, ninguna ruta de escritura guarda un archivo en el disco", async () => {
  const antes = archivosEnUploads();
  const escrituras = protegidas.filter((r) => r.metodo !== "GET" && r.metodo !== "DELETE");
  for (const r of escrituras) {
    const [metodo] = r.clave.split(" ");
    const res = await request(app)[metodo.toLowerCase()](`/api/v1${rutaConParametros(r.clave)}`)
      .field("nombre", "x").attach("imagen", PNG, "foto.png").attach("imagenes", PNG, "foto.png");
    assert.equal(res.status, 401, `${r.clave} con archivo y sin sesión respondió ${res.status}`);
  }
  assert.deepEqual(archivosEnUploads(), antes, "se guardó algún archivo sin sesión");
});
