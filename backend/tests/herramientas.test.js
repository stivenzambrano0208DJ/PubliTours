const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { spawnSync } = require("node:child_process");
const { request, app, sequelize, registrar } = require("./helpers");
const { Usuario } = require("../src/models");

test.after(() => sequelize.close());

const BACKEND = path.join(__dirname, "..");
const ejecutar = (script, args = [], env = {}) =>
  spawnSync(process.execPath, [path.join(BACKEND, script), ...args], { env: { ...process.env, ...env }, encoding: "utf8", timeout: 60000 });

// ---- cambiarClave: lo que se usa para sustituir la clave del administrador de desarrollo ----
test("cambiar:clave actualiza la contraseña, cierra las sesiones abiertas y la nueva clave sirve para entrar", async () => {
  const cuenta = await registrar("turista");
  const antes = await Usuario.findByPk(cuenta.usuario.id);

  const res = ejecutar("src/scripts/cambiarClave.js", [cuenta.correo], { NUEVA_CLAVE: "clave-larga-2031-ok" });
  assert.equal(res.status, 0, res.stderr);
  assert.match(res.stdout, /actualizada; sus sesiones abiertas se cerraron/);
  assert.ok(!res.stdout.includes("clave-larga-2031-ok") && !res.stderr.includes("clave-larga-2031-ok"), "no debe imprimir la clave");

  const despues = await Usuario.findByPk(cuenta.usuario.id);
  assert.equal(despues.token_version, antes.token_version + 1);
  assert.notEqual(despues.password_hash, antes.password_hash);
  assert.equal((await request(app).get("/api/v1/usuarios/me").set("Authorization", `Bearer ${cuenta.token}`)).status, 401); // la sesión anterior murió
  assert.equal((await request(app).post("/api/v1/auth/login").send({ correo: cuenta.correo, password: "clave12345" })).status, 401); // la clave vieja ya no
  assert.equal((await request(app).post("/api/v1/auth/login").send({ correo: cuenta.correo, password: "clave-larga-2031-ok" })).status, 200);
});

test("cambiar:clave rechaza claves débiles, claves por argumento y cuentas que no existen, sin tocar nada", async () => {
  const cuenta = await registrar("turista");
  const intacta = async () => (await Usuario.findByPk(cuenta.usuario.id)).password_hash;
  const hash = await intacta();

  for (const clave of ["corta1", "soloLetrasPeroLarga", "123456789012345", ""]) {
    const res = ejecutar("src/scripts/cambiarClave.js", [cuenta.correo], { NUEVA_CLAVE: clave });
    assert.equal(res.status, 1, `"${clave}" debería rechazarse`);
    assert.match(res.stderr, /al menos 12 caracteres/);
  }
  assert.equal(ejecutar("src/scripts/cambiarClave.js", [cuenta.correo, "clave-por-argumento-123"], { NUEVA_CLAVE: "" }).status, 1); // el argumento no cuenta
  const inexistente = ejecutar("src/scripts/cambiarClave.js", ["nadie@no-existe.com"], { NUEVA_CLAVE: "clave-larga-2031-ok" });
  assert.equal(inexistente.status, 1);
  assert.match(inexistente.stderr, /No existe una cuenta/);
  assert.equal(await intacta(), hash);
});

// ---- probarCorreo: debe mostrar el problema en vez de esconderlo ----
test("probar:correo avisa claramente cuando no hay credenciales configuradas", () => {
  const res = ejecutar("src/scripts/probarCorreo.js", [], { EMAIL_USER: "", EMAIL_PASS: "" });
  assert.equal(res.status, 1);
  assert.match(res.stderr, /Faltan EMAIL_USER y EMAIL_PASS/);
});

// ---- crear-env: genera los secretos del despliegue ----
function proyectoTemporal() {
  const raiz = fs.mkdtempSync(path.join(os.tmpdir(), "publitours-env-"));
  fs.mkdirSync(path.join(raiz, "scripts"));
  fs.copyFileSync(path.join(BACKEND, "..", "scripts", "crear-env.cjs"), path.join(raiz, "scripts", "crear-env.cjs"));
  fs.copyFileSync(path.join(BACKEND, "..", ".env.example"), path.join(raiz, ".env.example"));
  return raiz;
}

test("crear-env genera secretos nuevos y largos, sin mostrarlos, y no sobrescribe un .env existente", () => {
  const raiz = proyectoTemporal();
  const correr = () => spawnSync(process.execPath, [path.join(raiz, "scripts", "crear-env.cjs")], { encoding: "utf8" });
  try {
    const primera = correr();
    assert.equal(primera.status, 0, primera.stderr);
    const env = fs.readFileSync(path.join(raiz, ".env"), "utf8");
    const valor = (k) => env.match(new RegExp(`^${k}=(.*)$`, "m"))[1];
    assert.ok(valor("JWT_SECRET").length >= 64, "JWT_SECRET demasiado corto");
    assert.ok(valor("DB_PASSWORD").length >= 24, "DB_PASSWORD demasiado corta");
    assert.notEqual(valor("JWT_SECRET"), valor("DB_PASSWORD"));
    assert.ok(!primera.stdout.includes(valor("JWT_SECRET")) && !primera.stdout.includes(valor("DB_PASSWORD")), "no debe mostrar los secretos");
    assert.equal(valor("EMAIL_PASS"), ""); // el correo lo completa la persona
    assert.match(env, /^CORS_ORIGIN=/m); // el resto de la plantilla se conserva

    const antes = fs.readFileSync(path.join(raiz, ".env"), "utf8");
    assert.equal(correr().status, 1); // segunda vez: se niega
    assert.equal(fs.readFileSync(path.join(raiz, ".env"), "utf8"), antes);

    fs.rmSync(path.join(raiz, ".env"));
    const otra = correr();
    assert.equal(otra.status, 0);
    assert.notEqual(fs.readFileSync(path.join(raiz, ".env"), "utf8").match(/^JWT_SECRET=(.*)$/m)[1], valor("JWT_SECRET")); // cada generación es distinta
  } finally {
    fs.rmSync(raiz, { recursive: true, force: true });
  }
});

// ---- configurar-correo: guarda las credenciales sin mostrarlas ----
function proyectoConEnv({ conBackend = true } = {}) {
  const raiz = fs.mkdtempSync(path.join(os.tmpdir(), "publitours-correo-"));
  fs.mkdirSync(path.join(raiz, "scripts"));
  fs.copyFileSync(path.join(BACKEND, "..", "scripts", "configurar-correo.cjs"), path.join(raiz, "scripts", "configurar-correo.cjs"));
  fs.writeFileSync(path.join(raiz, ".env"), "DB_PASSWORD=secreto-de-la-base\nEMAIL_USER=\nEMAIL_PASS=\nCORS_ORIGIN=http://localhost:8081\n");
  if (conBackend) {
    fs.mkdirSync(path.join(raiz, "backend"));
    fs.writeFileSync(path.join(raiz, "backend", ".env"), "PORT=4000\nEMAIL_USER=viejo@gmail.com\nEMAIL_PASS=contraseñaquefugo\nJWT_SECRET=otro-secreto\n");
  }
  return raiz;
}
const configurar = (raiz, entrada) =>
  spawnSync(process.execPath, [path.join(raiz, "scripts", "configurar-correo.cjs")], { input: entrada, encoding: "utf8", timeout: 20000 });
const leer = (raiz, ...r) => fs.readFileSync(path.join(raiz, ...r), "utf8");

test("configurar-correo guarda correo y contraseña en los dos .env, sin mostrar la contraseña ni tocar el resto", () => {
  const raiz = proyectoConEnv();
  try {
    const res = configurar(raiz, "piloto@gmail.com\nabcd efgh ijkl mnop\ns\n"); // la contraseña puede venir con espacios, como la muestra Google
    assert.equal(res.status, 0, res.stderr + res.stdout);
    assert.ok(!res.stdout.includes("abcdefghijklmnop") && !res.stdout.includes("abcd efgh") && !res.stderr.includes("abcdefghijklmnop"), "no debe mostrar la contraseña");

    const principal = leer(raiz, ".env");
    assert.match(principal, /^EMAIL_USER=piloto@gmail\.com$/m);
    assert.match(principal, /^EMAIL_PASS=abcdefghijklmnop$/m); // sin espacios
    assert.match(principal, /^DB_PASSWORD=secreto-de-la-base$/m); // lo demás intacto
    assert.match(principal, /^CORS_ORIGIN=http:\/\/localhost:8081$/m);

    const desarrollo = leer(raiz, "backend", ".env");
    assert.match(desarrollo, /^EMAIL_USER=piloto@gmail\.com$/m);
    assert.match(desarrollo, /^EMAIL_PASS=abcdefghijklmnop$/m);
    assert.ok(!desarrollo.includes("contraseñaquefugo"), "la contraseña vieja debe desaparecer");
    assert.match(desarrollo, /^JWT_SECRET=otro-secreto$/m);
  } finally { fs.rmSync(raiz, { recursive: true, force: true }); }
});

test("configurar-correo puede dejar el .env de desarrollo como está si se responde que no", () => {
  const raiz = proyectoConEnv();
  try {
    assert.equal(configurar(raiz, "piloto@gmail.com\nabcdefghijklmnop\nn\n").status, 0);
    assert.match(leer(raiz, ".env"), /^EMAIL_PASS=abcdefghijklmnop$/m);
    assert.match(leer(raiz, "backend", ".env"), /^EMAIL_PASS=contraseñaquefugo$/m); // intacto
  } finally { fs.rmSync(raiz, { recursive: true, force: true }); }
});

test("configurar-correo rechaza correos y contraseñas que no corresponden, sin cambiar nada", () => {
  const raiz = proyectoConEnv();
  try {
    const antes = leer(raiz, ".env");
    const sinCorreo = configurar(raiz, "esto-no-es-un-correo\n");
    assert.equal(sinCorreo.status, 1);
    assert.match(sinCorreo.stderr, /no parece un correo/);
    for (const mala of ["corta", "esta-es-la-clave-de-mi-cuenta-123", "abcdefghijklmno!", ""]) {
      const res = configurar(raiz, `piloto@gmail.com\n${mala}\ns\n`);
      assert.equal(res.status, 1, `"${mala}" debería rechazarse`);
      assert.match(res.stderr, /16 letras/);
    }
    assert.equal(leer(raiz, ".env"), antes);
  } finally { fs.rmSync(raiz, { recursive: true, force: true }); }
});

test("configurar-correo avisa si todavía no existe el .env de la raíz", () => {
  const raiz = proyectoConEnv({ conBackend: false });
  try {
    fs.rmSync(path.join(raiz, ".env"));
    const res = configurar(raiz, "piloto@gmail.com\nabcdefghijklmnop\n");
    assert.equal(res.status, 1);
    assert.match(res.stderr, /crear-env/);
  } finally { fs.rmSync(raiz, { recursive: true, force: true }); }
});

// ---- seedAdmin: crea el administrador inicial con la misma regla de claves que cambiar:clave ----
test("seed:admin crea el administrador con una clave que cumple la regla, y esa clave sirve para entrar", async () => {
  const correo = `admin-seed-${Date.now()}@test.com`;
  const res = ejecutar("src/scripts/seedAdmin.js", [correo, "Admin Seed"], { CLAVE_ADMIN: "clave-admin-larga-2031" });
  assert.equal(res.status, 0, res.stderr);
  assert.match(res.stdout, /creado correctamente/);
  assert.ok(!res.stdout.includes("clave-admin-larga-2031") && !res.stderr.includes("clave-admin-larga-2031"), "no debe imprimir la clave");

  const usuario = await Usuario.findOne({ where: { correo } });
  assert.equal(usuario.rol, "administrador");
  assert.equal(usuario.correo_verificado, true);
  assert.equal((await request(app).post("/api/v1/auth/login").send({ correo, password: "clave-admin-larga-2031" })).status, 200);
});

test("seed:admin rechaza claves débiles o ausentes y no crea la cuenta", async () => {
  for (const clave of ["admin2026", "soloLetrasPeroLarga", "123456789012345", ""]) {
    const correo = `admin-debil-${Date.now()}-${clave.length}@test.com`;
    const res = ejecutar("src/scripts/seedAdmin.js", [correo, "Admin Debil"], { CLAVE_ADMIN: clave });
    assert.equal(res.status, 1, `aceptó la clave "${clave}"`);
    assert.equal(await Usuario.count({ where: { correo } }), 0, "no debe crear la cuenta");
  }
});

test("seed:admin acepta la clave por argumento (compatibilidad) pero con la misma regla, y promueve una cuenta existente sin pedir clave", async () => {
  const debil = `admin-arg-${Date.now()}@test.com`;
  assert.equal(ejecutar("src/scripts/seedAdmin.js", [debil, "Admin Arg", "admin2026"], { CLAVE_ADMIN: "" }).status, 1);
  assert.equal(await Usuario.count({ where: { correo: debil } }), 0);

  const cuenta = await registrar("turista");
  const res = ejecutar("src/scripts/seedAdmin.js", [cuenta.correo, "Quien sea"], { CLAVE_ADMIN: "" });
  assert.equal(res.status, 0, res.stderr);
  assert.match(res.stdout, /promovido a administrador/);
  assert.equal((await Usuario.findByPk(cuenta.usuario.id)).rol, "administrador");
});
