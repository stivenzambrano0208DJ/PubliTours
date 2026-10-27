const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const { request, app, sequelize, registrar, auth } = require("./helpers");
const { Prestador } = require("../src/models");
const { tipoDeImagen } = require("../src/utils/archivos");

test.after(() => sequelize.close());

const DIR = path.join(__dirname, "..", "public", "uploads", "sitios");
const archivos = () => new Set(fs.readdirSync(DIR));
// Imágenes mínimas pero con firma real
const PNG = Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==", "base64");
const JPG = Buffer.concat([Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10]), Buffer.from("JFIF"), Buffer.alloc(20)]);
const HTML = Buffer.from("<html><script>alert(document.cookie)</script></html>");

async function prestador() {
  const prest = await registrar("prestador");
  const p = await Prestador.create({ usuario_id: prest.usuario.id, nombre_negocio: "Subidas", categoria: "Naturaleza", municipio: "Florencia", estado_verificacion: "aprobado" });
  return { prest, p };
}
// POST /sitios con una foto de portada; devuelve la respuesta
const crearConFoto = ({ prest, p }, foto, extra = {}) =>
  request(app).post("/api/v1/sitios").set(auth(prest.token))
    .field("nombre", extra.nombre ?? "Con foto").field("categoria", "Naturaleza").field("municipio", "Florencia").field("precio", "1000").field("prestador_id", String(p.id))
    .attach("imagen", foto.contenido, { filename: foto.nombre, contentType: foto.tipo });
// Quita del disco lo que una prueba aceptó a propósito
const limpiar = (res) => { if (res.body?.imagen_url) fs.rmSync(path.join(__dirname, "..", "public", res.body.imagen_url), { force: true }); };

test("tipoDeImagen reconoce las cuatro imágenes permitidas por su firma y rechaza lo demás", () => {
  assert.equal(tipoDeImagen(PNG), "image/png");
  assert.equal(tipoDeImagen(JPG), "image/jpeg");
  assert.equal(tipoDeImagen(Buffer.from("GIF89a....")), "image/gif");
  assert.equal(tipoDeImagen(Buffer.concat([Buffer.from("RIFF"), Buffer.alloc(4), Buffer.from("WEBPVP8 ")])), "image/webp");
  assert.equal(tipoDeImagen(HTML), null);
  assert.equal(tipoDeImagen(Buffer.alloc(0)), null);
  assert.equal(tipoDeImagen(Buffer.from("RIFF....WAVEfmt ")), null); // RIFF pero no WEBP
});

test("una imagen real se guarda con la extensión de su tipo, aunque el nombre original diga otra cosa", async () => {
  const ctx = await prestador();
  const res = await crearConFoto(ctx, { contenido: PNG, nombre: "truco.js", tipo: "image/png" });
  try {
    assert.equal(res.status, 201);
    assert.match(res.body.imagen_url, /^\/uploads\/sitios\/sitio-\d+-\d+\.png$/); // nunca .js
  } finally { limpiar(res); }
});

test("un HTML o script disfrazado de imagen se rechaza y no queda en el disco", async () => {
  const ctx = await prestador();
  const antes = archivos();
  for (const nombre of ["malo.html", "malo.png", "malo.js"]) {
    const res = await crearConFoto(ctx, { contenido: HTML, nombre, tipo: "image/png" }, { nombre: `Disfraz ${nombre}` });
    assert.equal(res.status, 400, nombre);
    assert.match(res.body.error, /no es una imagen válida/);
  }
  assert.deepEqual([...archivos()].filter((f) => !antes.has(f)), []);
});

test("el tipo declarado debe coincidir con el contenido real", async () => {
  const ctx = await prestador();
  const antes = archivos();
  const res = await crearConFoto(ctx, { contenido: JPG, nombre: "foto.png", tipo: "image/png" }); // es JPEG pero dice PNG
  assert.equal(res.status, 400);
  assert.deepEqual([...archivos()].filter((f) => !antes.has(f)), []);
});

test("un tipo no permitido responde 400 con un mensaje claro, no un error interno", async () => {
  const ctx = await prestador();
  const res = await crearConFoto(ctx, { contenido: HTML, nombre: "pagina.html", tipo: "text/html" });
  assert.equal(res.status, 400);
  assert.match(res.body.error, /Formato de imagen no permitido/);
  const svg = await crearConFoto(ctx, { contenido: Buffer.from("<svg onload=alert(1)/>"), nombre: "x.svg", tipo: "image/svg+xml" });
  assert.equal(svg.status, 400);
});

test("una imagen demasiado grande dice cuál es el límite y no queda guardada", async () => {
  const ctx = await prestador();
  const antes = archivos();
  const grande = Buffer.concat([PNG, Buffer.alloc(5 * 1024 * 1024 + 10)]);
  const res = await crearConFoto(ctx, { contenido: grande, nombre: "enorme.png", tipo: "image/png" });
  assert.equal(res.status, 400);
  assert.match(res.body.error, /5 MB/);
  assert.deepEqual([...archivos()].filter((f) => !antes.has(f)), []);
});

test("si el formulario no pasa la validación, la foto que venía no queda huérfana", async () => {
  const ctx = await prestador();
  const antes = archivos();
  const res = await crearConFoto(ctx, { contenido: PNG, nombre: "ok.png", tipo: "image/png" }, { nombre: "" }); // falta el nombre
  assert.equal(res.status, 400);
  assert.deepEqual([...archivos()].filter((f) => !antes.has(f)), []);
});

test("si el servicio rechaza la petición (negocio no aprobado), tampoco queda la foto", async () => {
  const prest = await registrar("prestador");
  const p = await Prestador.create({ usuario_id: prest.usuario.id, nombre_negocio: "Pendiente", categoria: "Naturaleza", municipio: "Florencia", estado_verificacion: "pendiente" });
  const antes = archivos();
  const res = await crearConFoto({ prest, p }, { contenido: PNG, nombre: "ok.png", tipo: "image/png" });
  assert.equal(res.status, 403);
  assert.deepEqual([...archivos()].filter((f) => !antes.has(f)), []);
});

test("las fotos se sirven sin poder ejecutar código", async () => {
  const ctx = await prestador();
  const subida = await crearConFoto(ctx, { contenido: PNG, nombre: "ok.png", tipo: "image/png" });
  try {
    const res = await request(app).get(subida.body.imagen_url);
    assert.equal(res.status, 200);
    assert.match(res.headers["content-type"], /image\/png/);
    assert.equal(res.headers["content-security-policy"], "default-src 'none'; sandbox");
    assert.equal(res.headers["x-content-type-options"], "nosniff");
  } finally { limpiar(subida); }
});

test("la galería de un servicio valida cada foto igual que la portada", async () => {
  const ctx = await prestador();
  const sitio = (await request(app).post("/api/v1/sitios").set(auth(ctx.prest.token)).send({ nombre: "Galería", categoria: "Naturaleza", municipio: "Florencia", precio: 1, prestador_id: ctx.p.id })).body;
  const antes = archivos();
  const mala = await request(app).post(`/api/v1/sitios/${sitio.id}/imagenes`).set(auth(ctx.prest.token))
    .attach("imagenes", PNG, { filename: "a.png", contentType: "image/png" })
    .attach("imagenes", HTML, { filename: "b.png", contentType: "image/png" });
  assert.equal(mala.status, 400);
  assert.deepEqual([...archivos()].filter((f) => !antes.has(f)), []); // ni siquiera la primera, que sí era buena
  const buena = await request(app).post(`/api/v1/sitios/${sitio.id}/imagenes`).set(auth(ctx.prest.token)).attach("imagenes", JPG, { filename: "a.jpg", contentType: "image/jpeg" });
  try {
    assert.equal(buena.status, 201);
    assert.match(buena.body[0].imagen_url, /\.jpg$/);
  } finally { buena.body?.forEach?.((i) => fs.rmSync(path.join(__dirname, "..", "public", i.imagen_url), { force: true })); }
});

test("un nombre de archivo con caracteres de control se rechaza con 400, no con un error interno", async () => {
  const ctx = await prestador();
  const sitio = (await request(app).post("/api/v1/sitios").set(auth(ctx.prest.token)).send({ nombre: "Nombres raros", categoria: "Naturaleza", municipio: "Florencia", precio: 1000, prestador_id: ctx.p.id })).body;
  const antes = archivos();
  for (const nombre of ["a\u0000b.jpg", "a\u0001b.jpg"]) {
    const res = await request(app).post(`/api/v1/sitios/${sitio.id}/imagenes`).set(auth(ctx.prest.token)).attach("imagenes", JPG, { filename: nombre, contentType: "image/jpeg" });
    assert.equal(res.status, 400, JSON.stringify(nombre));
    assert.equal(res.body.error, "El formulario enviado no es válido.");
  }
  assert.deepEqual([...archivos()].filter((f) => !antes.has(f)), []); // y no deja nada en el disco
});
