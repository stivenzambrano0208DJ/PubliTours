import { test, expect } from "@playwright/test";
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { ADMIN, BACKEND_DIR, consultar } from "./entorno.mjs";
import { VIDEO_CAMARA } from "./rutas.mjs";

// Recorrido completo de PubliTours con tres personas a la vez (cada una con su propia sesión de navegador):
// prestador → administrador → turista → prestador → turista → administrador.
test.describe.configure({ mode: "serial" });

const id = Date.now();
const PRESTADOR = { nombre: "Prestador E2E", correo: `prestador${id}@e2e.com`, password: "ClaveE2E123" };
const TURISTA = { nombre: "Turista E2E", correo: `turista${id}@e2e.com`, password: "ClaveE2E123" };
const NEGOCIO = `Negocio E2E ${id}`;
const SERVICIO = `Cascada E2E ${id}`;
const COMENTARIO = `Experiencia inolvidable ${id}`;

const diaDentroDe = (dias) => {
  const f = new Date();
  f.setDate(f.getDate() + dias);
  return f.toLocaleDateString("en-CA");
};

let urlServicio;
const paginas = {};

// Las confirmaciones («¿Cancelar tu reserva?», «¿Retirar este mensaje?»…) son una ventana propia de la aplicación, no el diálogo del navegador.
const confirmar = (page, boton) => page.getByRole("alertdialog").getByRole("button", { name: boton }).click();

async function abrirSesion(browser) {
  const contexto = await browser.newContext();
  const page = await contexto.newPage();
  page.on("dialog", (d) => d.accept()); // por si algún aviso del navegador (p. ej. foto de baja resolución con respaldo) aparece
  return page;
}

// Por defecto deja el correo verificado directo en la base para no repetir el paso de cada prueba;
// el caso 15 prueba la verificación real por pantalla con { verificar: false }.
async function registrar(page, usuario, rol, { verificar = true } = {}) {
  await page.goto("/registro");
  if (rol === "prestador") await page.getByRole("button", { name: "Prestador" }).click();
  await page.getByPlaceholder("Tu nombre completo").fill(usuario.nombre);
  await page.getByPlaceholder("correo@dominio.com").fill(usuario.correo);
  await page.getByPlaceholder("Mínimo 8 caracteres").fill(usuario.password);
  if (rol === "prestador") {
    // El prestador deja solo lo básico de su negocio al registrarse; el resto lo completa después en el portal
    await page.getByLabel("Nombre del negocio").fill(NEGOCIO);
    await page.getByText("Hospedaje / Glamping").click();
    await page.getByLabel("Municipio de operación").selectOption("Florencia");
    await page.getByRole("checkbox", { name: /Acepto los/ }).check();
    await page.getByRole("button", { name: "Registrar mi negocio" }).click();
    await expect(page).toHaveURL("/mi-negocio");
  } else {
    await page.getByRole("checkbox", { name: /Acepto los/ }).check();
    await page.getByRole("button", { name: "Registrarme" }).click();
    await expect(page).toHaveURL("/");
  }
  if (verificar) {
    await consultar("UPDATE usuarios SET correo_verificado = true WHERE correo = $1", [usuario.correo]);
    await page.reload(); // la sesión vuelve a leer el estado del correo
  }
}

async function iniciarSesion(page, correo, password) {
  await page.goto("/login");
  await page.getByPlaceholder("correo@dominio.com").fill(correo);
  await page.getByPlaceholder("••••••••••••").fill(password);
  await page.getByRole("button", { name: "Iniciar sesión" }).click();
}

// Las fotos que suben las pruebas viven en la carpeta de uploads del backend: se borran al terminar.
test.afterAll(async () => {
  const { rows } = await consultar("SELECT imagen_url FROM paquetes WHERE imagen_url IS NOT NULL UNION SELECT imagen_url FROM imagenes_paquete");
  for (const { imagen_url } of rows) fs.rmSync(path.join(BACKEND_DIR, "public", imagen_url), { force: true });
});

test.beforeAll(async ({ browser }) => {
  paginas.prestador = await abrirSesion(browser);
  paginas.admin = await abrirSesion(browser);
  paginas.turista = await abrirSesion(browser);
});

test("1. el prestador se registra con lo básico, completa su perfil y recién entonces lo envía a revisión", async ({ browser }) => {
  // Un turista NO ve los campos de negocio; un prestador sí
  const visitante = await abrirSesion(browser);
  await visitante.goto("/registro");
  await expect(visitante.getByLabel("Nombre del negocio")).toHaveCount(0);
  await visitante.getByRole("button", { name: /Prestador/ }).click();
  await expect(visitante.getByLabel("Nombre del negocio")).toBeVisible();
  await expect(visitante.getByRole("button", { name: "Registrar mi negocio" })).toBeVisible();

  const page = paginas.prestador;
  await registrar(page, PRESTADOR, "prestador"); // cuenta + datos básicos del negocio en un solo paso

  // Etapa 2: perfil por completar. Mientras tanto NO está en revisión y no puede enviarlo
  await expect(page.getByRole("heading", { name: "Completa el perfil de tu negocio" })).toBeVisible();
  await expect(page.getByLabel("Nombre del negocio")).toHaveValue(NEGOCIO);
  const enviar = page.getByRole("button", { name: /Enviar a revisión/ });
  await expect(enviar).toBeDisabled();
  await expect(page.getByText("1/4")).toBeVisible();
  const { rows } = await consultar("SELECT estado_verificacion FROM prestadores WHERE nombre_negocio = $1", [NEGOCIO]);
  expect(rows[0].estado_verificacion).toBe("incompleto");

  await page.getByPlaceholder(/Cuéntale al turista/).fill("Negocio creado por la prueba de punta a punta, con cabañas y senderos.");
  await page.getByPlaceholder("Ej. 3001234567").fill("3001234567");
  await expect(enviar).toBeDisabled(); // aún falta la dirección
  await page.getByPlaceholder(/Vereda El Caraño/).fill("Vereda El Caraño, km 4 vía a Morelia");
  await expect(page.getByText("4/4")).toBeVisible();
  await expect(enviar).toBeEnabled();
  await enviar.click();

  await expect(page.getByText(/pendiente de verificación/)).toBeVisible();
  await expect(page.getByRole("button", { name: /Agregar servicio/ })).toHaveCount(0); // RN-01: aún no puede publicar
});

test("2. el administrador aprueba al prestador", async () => {
  const page = paginas.admin;
  await iniciarSesion(page, ADMIN.correo, ADMIN.password);
  await expect(page).toHaveURL("/");
  await page.goto("/admin");

  const tarjeta = page.locator("div.rounded-xl", { hasText: NEGOCIO }).last();
  await expect(tarjeta).toBeVisible();
  await tarjeta.getByRole("button", { name: "Aprobar" }).click();
  await expect(page.getByText(NEGOCIO)).toHaveCount(0);
});

test("3. el prestador aprobado publica un servicio con cupos", async () => {
  const page = paginas.prestador;
  await page.goto("/mi-negocio");
  await expect(page.getByText("Portal del Prestador")).toBeVisible();

  await page.getByRole("button", { name: /Agregar servicio/ }).click();
  await page.getByPlaceholder("Nombre", { exact: true }).fill(SERVICIO);
  await page.getByLabel("Categoría").selectOption("Naturaleza");
  await page.getByPlaceholder("Precio (COP)").fill("50000");
  await page.getByPlaceholder("Horario (ej. 8am-5pm)").fill("8am-5pm");
  await page.getByPlaceholder("Descripción").fill("Cascada de prueba para el recorrido E2E.");
  await page.getByPlaceholder("Ej. 20").fill("10");
  await page.getByRole("button", { name: "Crear servicio" }).click();

  await expect(page.getByRole("row", { name: new RegExp(SERVICIO) })).toBeVisible();
});

test("4. el turista se registra, encuentra el servicio y solicita una reserva", async () => {
  const page = paginas.turista;
  await registrar(page, TURISTA, "turista");
  await page.goto("/explorar");

  const tarjeta = page.getByRole("article").filter({ hasText: SERVICIO });
  await expect(tarjeta).toBeVisible();
  await tarjeta.getByRole("button", { name: /Ver detalle/ }).click();
  await expect(page).toHaveURL(/\/sitios\/\d+/);
  urlServicio = new URL(page.url()).pathname;

  await page.getByLabel(/Número de personas/).fill("2");
  await page.getByPlaceholder(/Viajamos con un niño/).fill("Somos vegetarianos");
  await expect(page.getByText(/\$100\.000 COP/)).toBeVisible(); // 2 personas × $50.000
  await page.getByRole("button", { name: "Reservar" }).click();
  await expect(page.getByText("Solicitud enviada")).toBeVisible();
});

test("5. el prestador recibe la alerta de nueva reserva y la confirma", async () => {
  const page = paginas.prestador;
  await page.goto("/mi-negocio");

  // Tiene 2 notificaciones sin leer (aprobación del negocio + nueva reserva): la alerta las resume y la campana las lista.
  await expect(page.getByRole("alert")).toContainText("Tienes 2 notificaciones sin leer");
  await page.getByRole("button", { name: "Notificaciones", exact: true }).click();
  await expect(page.getByText(/nueva solicitud de reserva/i)).toBeVisible();
  await expect(page.getByText(/fue aprobado/)).toBeVisible();
  await page.getByRole("button", { name: "Marcar todas como leídas" }).click();
  await page.keyboard.press("Escape");
  await page.getByText("Portal del Prestador").click(); // cierra el menú de notificaciones
  const reserva = page.locator("div.rounded-xl", { hasText: TURISTA.nombre }).last();
  await expect(reserva).toContainText("2 personas");
  await expect(reserva).toContainText("Somos vegetarianos");
  await reserva.getByRole("button", { name: "Confirmar" }).click();
  await expect(reserva).toContainText("Confirmada");
});

test("6. el turista ve su reserva confirmada y puede cancelar una segunda", async () => {
  const page = paginas.turista;
  await page.goto("/mis-reservas");
  await expect(page.getByRole("article").filter({ hasText: "CONFIRMADA" })).toBeVisible();

  // Agregar al calendario: se descarga un .ics con el servicio y el código del comprobante
  const [descarga] = await Promise.all([
    page.waitForEvent("download"),
    page.getByRole("article").filter({ hasText: "CONFIRMADA" }).getByRole("button", { name: "Agregar al calendario" }).click(),
  ]);
  expect(descarga.suggestedFilename()).toMatch(/^reserva-\d+\.ics$/);
  const ics = fs.readFileSync(await descarga.path(), "utf8");
  expect(ics).toContain("BEGIN:VEVENT");
  expect(ics).toContain(`SUMMARY:${SERVICIO}`);
  expect(ics).toMatch(/DTSTART;VALUE=DATE:\d{8}/);

  // Segunda reserva en otra fecha y cancelación posterior
  await page.goto(urlServicio);
  await page.locator('input[type="date"]').fill(diaDentroDe(3));
  await page.getByRole("button", { name: "Reservar" }).click();
  await expect(page.getByText("Solicitud enviada")).toBeVisible();

  await page.goto("/mis-reservas");
  const pendiente = page.getByRole("article").filter({ hasText: "PENDIENTE" });
  await pendiente.getByRole("button", { name: "Cancelar reserva" }).click();
  await confirmar(page, "Sí, cancelar");
  await expect(page.getByRole("article").filter({ hasText: "CANCELADA" })).toBeVisible();
});

test("7. cumplida la fecha, la reserva se completa y el turista la califica", async () => {
  const page = paginas.turista;
  await consultar("UPDATE reservas SET fecha_servicio = '2020-01-01' WHERE estado = 'confirmada'");

  await page.goto("/mis-reservas");
  await expect(page.getByRole("article").filter({ hasText: "COMPLETADA" })).toBeVisible();
  await page.getByRole("button", { name: "Calificar experiencia" }).click();
  await page.getByRole("radio", { name: "5 estrellas" }).click();
  await page.getByPlaceholder(/Cuéntanos cómo te fue/).fill(COMENTARIO);
  await page.getByRole("button", { name: "Enviar calificación" }).click();
  await expect(page.getByText("Tu calificación")).toBeVisible();

  await page.goto(urlServicio);
  await expect(page.getByText("Reseñas de viajeros")).toBeVisible();
  await expect(page.getByText(COMENTARIO)).toBeVisible();
});

test("8. el prestador responde la reseña y el turista la ve publicada", async () => {
  const page = paginas.prestador;
  await page.goto("/mi-negocio");
  const resena = page.getByRole("article").filter({ hasText: COMENTARIO });
  await resena.getByRole("button", { name: "Responder" }).click();
  await resena.getByPlaceholder(/Agradece o aclara/).fill("¡Gracias por visitarnos!");
  await resena.getByRole("button", { name: "Publicar respuesta" }).click();
  await expect(resena.getByText("¡Gracias por visitarnos!")).toBeVisible();

  await paginas.turista.goto(urlServicio);
  await expect(paginas.turista.getByText("Respuesta del prestador")).toBeVisible();
});

test("9. el administrador suspende al turista y este ya no puede entrar", async ({ browser }) => {
  const page = paginas.admin;
  await page.goto("/admin");
  await page.getByRole("button", { name: "Usuarios" }).click();
  await page.getByPlaceholder("Buscar por nombre o correo...").fill(TURISTA.correo);
  const fila = page.getByRole("row", { name: new RegExp(TURISTA.correo) });
  await expect(fila).toBeVisible();
  await fila.getByRole("button", { name: "Suspender" }).click();
  await confirmar(page, "Suspender");
  await expect(fila).toContainText("Suspendida");

  const otra = await abrirSesion(browser);
  await iniciarSesion(otra, TURISTA.correo, TURISTA.password);
  await expect(otra.getByText(/cuenta está suspendida/)).toBeVisible();
});

test("10. un turista describe su viaje con lenguaje natural y obtiene un itinerario del catálogo", async ({ browser }) => {
  const page = await abrirSesion(browser);
  await registrar(page, { nombre: "Viajera E2E", correo: `viajera${id}@e2e.com`, password: "ClaveE2E123" }, "turista");
  await page.goto("/itinerario");

  await page.getByPlaceholder(/viaje romántico/).fill("Quiero un viaje de 1 día en Florencia con 200 mil pesos");
  await page.getByRole("button", { name: /Interpretar mi viaje/ }).click();

  // Sin ANTHROPIC_API_KEY en las pruebas, responde el intérprete básico (mismo contrato que la IA)
  await expect(page.getByRole("status")).toContainText("Interpretación básica");
  await expect(page.getByPlaceholder("Presupuesto total (COP)")).toHaveValue("200000");
  await expect(page.getByPlaceholder("Días de viaje")).toHaveValue("1");
  // Fecha de inicio real y número de personas: el itinerario se arma y se reserva para ESAS fechas
  const inicio = diaDentroDe(20);
  await page.getByLabel("Fecha de inicio").fill(inicio);
  await page.getByLabel("Número de personas").fill("2");
  await expect(page.getByRole("button", { name: "Quitar municipio" })).toBeVisible(); // chip "Solo en: Florencia"

  await page.getByRole("button", { name: "Generar itinerario" }).click();
  await expect(page.getByText("Tu itinerario personalizado en el Caquetá")).toBeVisible();
  await expect(page.getByRole("heading", { name: SERVICIO })).toBeVisible(); // solo sitios reales del catálogo
  await expect(page.getByRole("heading", { name: /^Día 1/ })).toContainText(String(new Date(inicio + "T12:00:00").getDate())); // el día 1 muestra la fecha elegida

  // Reservar todo usa esas fechas y esas personas (no una fecha de ejemplo)
  await page.getByRole("button", { name: /Reservar todo el itinerario/ }).first().click();
  await expect(page.getByText(/solicitudes de reserva enviadas/)).toBeVisible();
  const { rows } = await consultar(
    "SELECT r.fecha_servicio::text AS fecha, r.personas FROM reservas r JOIN usuarios u ON u.id = r.turista_id WHERE u.correo = $1",
    [`viajera${id}@e2e.com`]
  );
  expect(rows.length).toBeGreaterThan(0);
  expect(rows[0].fecha).toBe(inicio);
  expect(rows[0].personas).toBe(2);
});

test("11. el prestador arma un paquete con dos servicios y un turista lo reserva en una sola solicitud", async ({ browser }) => {
  const CABALGATA = `Cabalgata E2E ${id}`;
  const PAQUETE = `Paquete E2E ${id}`;

  // El prestador publica un segundo servicio y arma el paquete
  const prestador = paginas.prestador;
  await prestador.goto("/mi-negocio");
  await prestador.getByRole("button", { name: /Agregar servicio/ }).click();
  await prestador.getByPlaceholder("Nombre", { exact: true }).fill(CABALGATA);
  await prestador.getByLabel("Categoría").selectOption("Aventura");
  await prestador.getByPlaceholder("Precio (COP)").fill("40000");
  await prestador.getByRole("button", { name: "Crear servicio" }).click();
  await expect(prestador.getByRole("row", { name: new RegExp(CABALGATA) })).toBeVisible();

  await prestador.getByRole("button", { name: /Crear paquete/ }).click();
  await prestador.getByPlaceholder("Nombre del paquete").fill(PAQUETE);
  await prestador.getByRole("checkbox", { name: new RegExp(SERVICIO) }).check();
  await prestador.getByRole("checkbox", { name: new RegExp(CABALGATA) }).check();
  await prestador.getByPlaceholder("Ej. 150000").fill("60000");
  const PNG = Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==", "base64");
  await prestador.locator('input[type="file"]:not([data-galeria])').setInputFiles({ name: "portada.png", mimeType: "image/png", buffer: PNG }); // foto de portada propia
  await confirmar(prestador, "Subirla de todas formas"); // la foto de prueba es de 1×1 píxel: se avisa de la resolución baja
  await expect(prestador.getByAltText("Vista previa de la portada")).toBeVisible();
  // galería propia: dos fotos más, que se suben al crear el paquete
  await prestador.locator('input[data-galeria="true"]').setInputFiles([
    { name: "galeria1.png", mimeType: "image/png", buffer: PNG },
    { name: "galeria2.png", mimeType: "image/png", buffer: PNG },
  ]);
  await confirmar(prestador, "Subirla de todas formas"); // una pregunta por cada foto
  await confirmar(prestador, "Subirla de todas formas");
  await expect(prestador.getByText("Galería de fotos (2/8)")).toBeVisible();
  await expect(prestador.getByText(/el turista ahorra/)).toContainText("30.000"); // 50.000 + 40.000 sueltos vs 60.000
  await prestador.getByRole("button", { name: "Crear paquete" }).last().click();
  await expect(prestador.getByRole("link", { name: PAQUETE })).toBeVisible();

  // Un turista nuevo lo encuentra y reserva todo de una vez
  const turista = await abrirSesion(browser);
  await registrar(turista, { nombre: "Paquetera E2E", correo: `paquetera${id}@e2e.com`, password: "ClaveE2E123" }, "turista");
  await turista.goto("/paquetes");
  await turista.getByRole("link", { name: new RegExp(PAQUETE) }).click();
  await expect(turista.getByRole("heading", { name: PAQUETE })).toBeVisible();
  await expect(turista.getByRole("img", { name: PAQUETE })).toBeVisible(); // portada propia del paquete en la galería
  // portada + 2 fotos de la galería propia = 3 fotos; se abren en el visor a pantalla completa
  await turista.getByRole("button", { name: `Ver fotos de ${PAQUETE}` }).click();
  await expect(turista.getByText("1 / 3")).toBeVisible();
  await turista.getByRole("button", { name: "Foto siguiente" }).click();
  await expect(turista.getByText("2 / 3")).toBeVisible();
  await turista.getByRole("button", { name: "Cerrar visor" }).click();
  await expect(turista.getByText(SERVICIO)).toBeVisible();
  await expect(turista.getByText(CABALGATA)).toBeVisible();
  await turista.getByLabel(/Número de personas/).fill("2");
  await expect(turista.getByText(/\$120\.000 COP/)).toBeVisible(); // 2 × $60.000
  await turista.getByRole("button", { name: "Reservar paquete" }).click();
  await expect(turista.getByText("Solicitud enviada")).toBeVisible();

  // El prestador recibe UNA solicitud del paquete y la confirma
  await prestador.reload();
  const solicitud = prestador.locator("div.rounded-xl", { hasText: "Paquetera E2E" }).last();
  await expect(solicitud).toContainText(PAQUETE);
  await expect(solicitud).toContainText("2 personas");
  await solicitud.getByRole("button", { name: "Confirmar" }).click();
  await expect(solicitud).toContainText("Confirmada");

  // El turista la ve confirmada como paquete, con sus servicios incluidos
  await turista.goto("/mis-reservas");
  const reserva = turista.getByRole("article").filter({ hasText: PAQUETE });
  await expect(reserva).toContainText("CONFIRMADA");
  await expect(reserva).toContainText(`Incluye: ${SERVICIO} + ${CABALGATA}`);
  await expect(reserva.getByRole("button", { name: "Calificar experiencia" })).toHaveCount(0);
});

test("12. cumplida la fecha, el turista califica el paquete y el prestador responde", async ({ browser }) => {
  const PAQUETE = `Paquete E2E ${id}`;
  const COMENTARIO_PAQUETE = `Paquete inolvidable ${id}`;
  await consultar("UPDATE reservas SET fecha_servicio = '2020-02-02' WHERE paquete_id IS NOT NULL AND estado = 'confirmada'");

  const turista = await abrirSesion(browser);
  await iniciarSesion(turista, `paquetera${id}@e2e.com`, "ClaveE2E123");
  await expect(turista).toHaveURL("/");
  await turista.goto("/mis-reservas");
  const reserva = turista.getByRole("article").filter({ hasText: PAQUETE });
  await expect(reserva).toContainText("COMPLETADA");
  await reserva.getByRole("button", { name: "Calificar experiencia" }).click();
  await turista.getByRole("radio", { name: "5 estrellas" }).click();
  await turista.getByPlaceholder(/Cuéntanos cómo te fue/).fill(COMENTARIO_PAQUETE);
  await turista.getByRole("button", { name: "Enviar calificación" }).click();
  await expect(reserva).toContainText("Tu calificación");

  // La reseña aparece en la página del paquete y en el listado con su promedio
  await turista.goto("/paquetes");
  await expect(turista.getByRole("link", { name: new RegExp(PAQUETE) })).toContainText("5 (1)");
  await turista.getByRole("link", { name: new RegExp(PAQUETE) }).click();
  await expect(turista.getByText(COMENTARIO_PAQUETE)).toBeVisible();

  // El prestador la ve identificada como reseña de paquete y la responde
  const prestador = paginas.prestador;
  await prestador.goto("/mi-negocio");
  const resena = prestador.getByRole("article").filter({ hasText: COMENTARIO_PAQUETE });
  await expect(resena).toContainText(`Paquete: ${PAQUETE}`);
  await resena.getByRole("button", { name: "Responder" }).click();
  await resena.getByPlaceholder(/Agradece o aclara/).fill("¡Gracias por elegir nuestro paquete!");
  await resena.getByRole("button", { name: "Publicar respuesta" }).click();
  await turista.reload();
  await expect(turista.getByText("Respuesta del prestador")).toBeVisible();
});

test("13. el administrador oculta el paquete con un motivo y el prestador no puede reactivarlo", async ({ browser }) => {
  const PAQUETE = `Paquete E2E ${id}`;
  const admin = paginas.admin;
  await admin.goto("/admin");
  await admin.getByRole("button", { name: "Paquetes" }).click();
  const fila = admin.getByRole("row", { name: new RegExp(PAQUETE) });
  await expect(fila).toBeVisible();
  await fila.getByRole("button", { name: "Ocultar" }).click();
  await admin.getByPlaceholder(/La descripción no corresponde/).fill("Información poco clara");
  await admin.getByRole("button", { name: "Ocultar paquete" }).click();
  await expect(fila).toContainText("Oculto por ti");

  // Ya no es público
  const visitante = await abrirSesion(browser);
  await visitante.goto("/paquetes");
  await expect(visitante.getByRole("link", { name: new RegExp(PAQUETE) })).toHaveCount(0);

  // El prestador ve el motivo y no tiene forma de reactivarlo
  const prestador = paginas.prestador;
  await prestador.goto("/mi-negocio");
  const tarjeta = prestador.locator("#paquetes").getByRole("article").filter({ hasText: PAQUETE });
  await expect(tarjeta).toContainText("Oculto por el administrador");
  await expect(tarjeta).toContainText("Información poco clara");
  await expect(tarjeta.getByRole("button", { name: "Publicar" })).toHaveCount(0);
  await expect(tarjeta.getByRole("button", { name: "Pausar" })).toHaveCount(0);

  // Si el administrador lo vuelve a publicar, reaparece
  await fila.getByRole("button", { name: "Publicar" }).click();
  await expect(fila).toContainText("Publicado");
  await visitante.reload();
  await expect(visitante.getByRole("link", { name: new RegExp(PAQUETE) })).toBeVisible();
});

test("14. cualquier visitante abre la página pública del negocio desde un servicio y ve todo lo que ofrece", async ({ browser }) => {
  const PAQUETE = `Paquete E2E ${id}`;
  const visitante = await abrirSesion(browser); // sin iniciar sesión

  await visitante.goto(urlServicio);
  await visitante.getByRole("link", { name: "Ver negocio" }).click();
  await expect(visitante).toHaveURL(/\/negocios\/\d+/);

  await expect(visitante.getByRole("heading", { name: NEGOCIO })).toBeVisible();
  await expect(visitante.getByText("Negocio verificado")).toBeVisible();
  await expect(visitante.getByText("Vereda El Caraño, km 4 vía a Morelia")).toBeVisible(); // lo que completó en la etapa 2
  await expect(visitante.getByRole("link", { name: /WhatsApp/ })).toHaveAttribute("href", "https://wa.me/573001234567");

  await expect(visitante.getByRole("heading", { name: "Servicios (2)" })).toBeVisible();
  await expect(visitante.getByRole("heading", { name: SERVICIO })).toBeVisible();
  await expect(visitante.getByRole("heading", { name: PAQUETE })).toBeVisible();

  // reseñas de un servicio y de un paquete, con las respuestas del negocio
  await expect(visitante.getByText(COMENTARIO)).toBeVisible();
  await expect(visitante.getByText(`Paquete inolvidable ${id}`)).toBeVisible();
  await expect(visitante.getByText("Respuesta del negocio")).toHaveCount(2);

  // desde la página del negocio se llega a sus servicios
  await visitante.getByRole("heading", { name: SERVICIO }).click();
  await expect(visitante).toHaveURL(urlServicio);
});

test("15. un correo sin verificar no puede reservar; con el código de verificación sí", async ({ browser }) => {
  const nuevo = { nombre: "Sin Verificar E2E", correo: `sinverificar${id}@e2e.com`, password: "ClaveE2E123" };
  const page = await abrirSesion(browser);

  // Al registrarse hay que aceptar los términos (y se pueden leer antes de aceptar)
  await page.goto("/registro");
  await page.getByPlaceholder("Tu nombre completo").fill(nuevo.nombre);
  await page.getByPlaceholder("correo@dominio.com").fill(nuevo.correo);
  await page.getByPlaceholder("Mínimo 8 caracteres").fill(nuevo.password);
  await page.getByRole("button", { name: "Registrarme" }).click(); // sin marcar la casilla: el navegador no deja enviar
  await expect(page).toHaveURL(/\/registro/);
  await expect(page.getByRole("link", { name: "Términos y Condiciones" })).toHaveAttribute("href", "/terminos");
  await page.getByRole("checkbox", { name: /Acepto los/ }).check();
  await page.getByRole("button", { name: "Registrarme" }).click();
  await expect(page).toHaveURL("/");

  // Aparece el aviso para verificar el correo, con la dirección a la que se envió el código
  const aviso = page.getByRole("region", { name: "Verifica tu correo" });
  await expect(aviso).toContainText(nuevo.correo);

  // Puede navegar, pero no reservar
  await page.goto(urlServicio);
  await page.getByRole("button", { name: "Reservar" }).click();
  await expect(page.getByText(/Verifica tu correo para continuar/).first()).toBeVisible();
  await expect(page.getByText("Solicitud enviada")).toHaveCount(0);

  // Un código incorrecto no sirve
  await aviso.getByLabel("Código de verificación").fill("000000");
  await aviso.getByRole("button", { name: "Verificar" }).click();
  await expect(aviso).toContainText("inválido o ya expiró");

  // El código real (en la base solo existe su hash: se fija uno conocido, como si lo hubiera leído del correo)
  const codigo = "246810";
  await consultar(
    "UPDATE codigos_verificacion SET codigo_hash = $1 WHERE usado = false AND usuario_id = (SELECT id FROM usuarios WHERE correo = $2)",
    [crypto.createHash("sha256").update(codigo).digest("hex"), nuevo.correo]
  );
  await aviso.getByLabel("Código de verificación").fill(codigo);
  await aviso.getByRole("button", { name: "Verificar" }).click();
  await expect(aviso).toHaveCount(0); // el aviso desaparece

  // Ahora sí puede reservar
  await page.getByRole("button", { name: "Reservar" }).click();
  await expect(page.getByText("Solicitud enviada")).toBeVisible();
});

test("16. los Términos y la Política de Privacidad son públicos y están enlazados desde el pie de página", async ({ browser }) => {
  const visitante = await abrirSesion(browser);
  await visitante.goto("/");
  await visitante.getByRole("link", { name: "Términos y condiciones" }).click();
  await expect(visitante).toHaveURL("/terminos");
  await expect(visitante.getByRole("heading", { level: 1, name: /Términos y Condiciones/ })).toBeVisible();
  await expect(visitante.getByText(/no procesa pagos/)).toBeVisible();

  await visitante.getByRole("link", { name: "Política de privacidad (Ley 1581 de 2012)" }).click();
  await expect(visitante).toHaveURL("/privacidad");
  await expect(visitante.getByRole("heading", { level: 1, name: /Tratamiento de Datos Personales/ })).toBeVisible();
  await expect(visitante.getByText(/Superintendencia de Industria y Comercio/)).toBeVisible();
});

test("17. precios flexibles, calendario de disponibilidad, comprobante con código y reserva modificable", async ({ browser }) => {
  const prestador = paginas.prestador;
  const viajero = { nombre: "Viajero Dos", correo: `viajero2${id}@e2e.com`, password: "ClaveE2E123" };

  // El prestador define tarifa de niños y descuento por grupo en su servicio
  await prestador.goto("/mi-negocio");
  await prestador.getByRole("row", { name: new RegExp(SERVICIO) }).getByTitle("Editar").click();
  await prestador.getByText("Precios flexibles").click();
  await prestador.getByPlaceholder("Vacío = pagan lo mismo que un adulto").fill("25000");
  await prestador.getByLabel("Desde cuántas personas").fill("4");
  await prestador.getByLabel("Porcentaje de descuento").fill("10");
  await prestador.getByRole("button", { name: "Guardar cambios" }).click();
  await expect(prestador.getByRole("button", { name: "Guardar cambios" })).toHaveCount(0);

  // El turista ve las tarifas, el calendario y el total calculado con niños y descuento
  const page = await abrirSesion(browser);
  await registrar(page, viajero, "turista");
  await page.goto(urlServicio);
  await expect(page.getByText("Niños: $25.000")).toBeVisible();
  await expect(page.getByText("10 % de descuento desde 4 personas")).toBeVisible();

  const fecha = diaDentroDe(8);
  await page.locator('input[type="date"]').first().fill(fecha);
  await page.getByLabel(/Número de personas/).fill("4");
  await page.getByLabel(/De ellas, niños/).fill("2");
  // 2 adultos × $50.000 + 2 niños × $25.000 = $150.000, menos 10 % por grupo = $135.000
  await expect(page.getByText("$135.000 COP")).toBeVisible();
  await expect(page.getByText(/descuento por grupo 10 %/)).toBeVisible();

  await page.getByRole("button", { name: /Ver calendario de disponibilidad/ }).click();
  const calendario = page.getByLabel("Calendario de disponibilidad");
  await expect(calendario).toBeVisible();
  await expect(calendario.locator('[data-estado="libre"]').first()).toBeVisible();
  await page.getByRole("button", { name: "Reservar" }).click();
  await expect(page.getByText("Solicitud enviada")).toBeVisible();

  // El prestador confirma y el turista obtiene su comprobante con código
  await prestador.goto("/mi-negocio");
  const solicitud = prestador.locator("div.rounded-xl", { hasText: viajero.nombre }).last();
  await expect(solicitud).toContainText("4 personas");
  await solicitud.getByRole("button", { name: "Confirmar" }).click();
  await expect(solicitud).toContainText("Confirmada");

  await page.goto("/mis-reservas");
  const reserva = page.getByRole("article").filter({ hasText: SERVICIO }).filter({ hasText: "CONFIRMADA" });
  await reserva.getByRole("link", { name: /Ver comprobante/ }).click();
  const codigo = (await page.getByTestId("codigo").textContent()).trim();
  expect(codigo).toMatch(/^PT-[A-Z2-9]{6}$/);
  await expect(page.getByText("$135.000 COP")).toBeVisible();

  // Cualquiera (el prestador al escanear el QR) verifica el código sin iniciar sesión
  const verificador = await abrirSesion(browser);
  await verificador.goto(`/verificar/${codigo}`);
  await expect(verificador.getByRole("heading", { name: "Reserva válida" })).toBeVisible();
  await expect(verificador.getByText("Viajero D.")).toBeVisible();

  // El turista modifica su reserva confirmada: queda pendiente con el nuevo total
  await page.goto("/mis-reservas");
  await page.getByRole("article").filter({ hasText: codigo.length ? SERVICIO : "" }).filter({ hasText: "CONFIRMADA" })
    .getByRole("button", { name: "Modificar reserva" }).click();
  await expect(page.getByText(/volverá a quedar pendiente/)).toBeVisible();
  await page.getByLabel(/Número de personas/).fill("2");
  await page.getByLabel(/De ellas, niños/).fill("0");
  await expect(page.getByText("$100.000 COP")).toBeVisible();
  await page.getByRole("button", { name: "Guardar cambios" }).click();

  const modificada = page.getByRole("article").filter({ hasText: SERVICIO }).filter({ hasText: "PENDIENTE" });
  await expect(modificada).toContainText("2 personas");
  // y el prestador recibe el aviso de la modificación
  await prestador.reload();
  await prestador.getByRole("button", { name: "Notificaciones", exact: true }).click();
  await expect(prestador.getByText(/modificó su reserva/).first()).toBeVisible();
});

test("18. Explorar filtra por calificación mínima, por fecha disponible y ordena por mejor calificados", async ({ browser }) => {
  const page = await abrirSesion(browser);
  const tarjeta = () => page.getByRole("article").filter({ hasText: SERVICIO });
  await page.goto("/explorar");
  await expect(tarjeta()).toBeVisible();

  // El servicio tiene una reseña de 5 estrellas (paso 7): aparece con 4 o más, y "Mejor calificados" lo muestra primero
  await page.getByLabel("Calificación mínima").selectOption("4");
  await expect(tarjeta()).toBeVisible();
  await page.getByLabel("Calificación mínima").selectOption("");
  await page.locator("select").filter({ hasText: "Mejor calificados" }).selectOption("calificacion");
  await expect(page.getByRole("article").first()).toContainText(SERVICIO);

  // El prestador no atiende un día: ese día el servicio ya no se ofrece, y otro día sí
  const bloqueado = diaDentroDe(45);
  await consultar(
    "INSERT INTO fechas_bloqueadas (sitio_id, fecha, motivo) SELECT id, $1, 'Prueba' FROM sitios_turisticos WHERE nombre = $2",
    [bloqueado, SERVICIO]
  );
  await page.getByLabel("Disponible el").fill(bloqueado);
  await expect(tarjeta()).toHaveCount(0);
  await page.getByLabel("Disponible el").fill(diaDentroDe(46));
  await expect(tarjeta()).toBeVisible();
  await page.getByRole("button", { name: "Quitar fecha" }).click();
  await expect(tarjeta()).toBeVisible();
});

test("19. el administrador ve el historial de sus acciones, las tendencias y envía un anuncio a los negocios", async () => {
  const admin = paginas.admin;
  await admin.goto("/admin");

  // Historial: la aprobación del paso 2 y la moderación del paso 13 quedaron registradas con su autor
  await admin.getByRole("button", { name: "Historial" }).click();
  await expect(admin.getByText(NEGOCIO).first()).toBeVisible();
  await expect(admin.locator("li span", { hasText: "Negocio aprobado" }).first()).toBeVisible();
  await expect(admin.getByText(`Paquete E2E ${id} — motivo: Información poco clara`)).toBeVisible();

  // Tendencias: números agregados del periodo y gráficas
  await admin.getByRole("button", { name: "Tendencias" }).click();
  await expect(admin.getByText("Valor aceptado", { exact: true })).toBeVisible();
  await expect(admin.getByRole("img", { name: /^Solicitudes de reserva por mes/ })).toBeVisible();

  // Anuncio: llega como notificación al prestador aprobado y queda en el historial
  await admin.getByRole("button", { name: "Anuncios" }).click();
  await admin.getByLabel(/^Mensaje/).fill(`Aviso E2E ${id}: mañana hay mantenimiento.`);
  await admin.getByRole("button", { name: "Enviar anuncio" }).click();
  await expect(admin.getByRole("status")).toContainText("Anuncio enviado a");
  const { rows } = await consultar(
    "SELECT COUNT(*)::int AS n FROM notificaciones WHERE tipo = 'anuncio_admin' AND usuario_id = (SELECT id FROM usuarios WHERE correo = $1)",
    [PRESTADOR.correo]
  );
  expect(rows[0].n).toBe(1);

  await admin.getByRole("button", { name: "Historial" }).click();
  await expect(admin.getByText(new RegExp(`Aviso E2E ${id}`))).toBeVisible();
});

test("20. la política de cancelación se elige, se ve antes de reservar y marca como tardía una cancelación fuera de plazo", async ({ browser }) => {
  const prestador = paginas.prestador;
  const viajero = { nombre: "Viajero Tres", correo: `viajero3${id}@e2e.com`, password: "ClaveE2E123" };

  // El prestador elige una política moderada (gratis hasta 3 días antes)
  await prestador.goto("/mi-negocio");
  await prestador.getByRole("row", { name: new RegExp(SERVICIO) }).getByTitle("Editar").click();
  await prestador.getByRole("combobox", { name: /Política de cancelación/ }).selectOption("moderada");
  await prestador.getByRole("button", { name: "Guardar cambios" }).click();
  await expect(prestador.getByRole("button", { name: "Guardar cambios" })).toHaveCount(0);

  // El turista la ve antes de reservar
  const page = await abrirSesion(browser);
  await registrar(page, viajero, "turista");
  await page.goto(urlServicio);
  await expect(page.getByText("Cancelación moderada.")).toBeVisible();
  await expect(page.getByText(/Gratis hasta 3 días antes del servicio/)).toBeVisible();

  // Reserva para dentro de 2 días: el prestador confirma
  await page.locator('input[type="date"]').first().fill(diaDentroDe(2));
  await page.getByRole("button", { name: "Reservar" }).click();
  await expect(page.getByText("Solicitud enviada")).toBeVisible();
  await prestador.goto("/mi-negocio");
  const solicitud = prestador.locator("div.rounded-xl", { hasText: viajero.nombre }).last();
  await solicitud.getByRole("button", { name: "Confirmar" }).click();
  await expect(solicitud).toContainText("Confirmada");

  // El turista puede cancelar, pero se le advierte y queda registrado como tardía
  await page.goto("/mis-reservas");
  const reserva = page.getByRole("article").filter({ hasText: SERVICIO }).filter({ hasText: "CONFIRMADA" });
  await reserva.getByRole("button", { name: "Cancelar reserva" }).click();
  const advertencia = page.getByRole("alertdialog");
  await expect(advertencia).toContainText("se registrará como cancelación tardía");
  await expect(advertencia).toContainText("3 días");
  await confirmar(page, "Sí, cancelar");
  await expect(page.getByText(/Se registró como cancelación tardía/)).toBeVisible();

  // El prestador lo ve en su lista y en las estadísticas
  await prestador.reload();
  await expect(prestador.locator("div.rounded-xl", { hasText: viajero.nombre }).last()).toContainText("Cancelada por el turista (tardía)");
  await prestador.locator("#estadisticas").getByLabel("Hasta").fill(diaDentroDe(10)); // la reserva es de dentro de 2 días
  await expect(prestador.locator("#estadisticas")).toContainText(/\d+ cancelada\(s\), 1 tardía\(s\)/);
});

test("21. el prestador registra la asistencia: «no asistió» no permite calificar y «asistió» sí", async ({ browser }) => {
  const prestador = paginas.prestador;
  const viajero = { nombre: "Viajero Cuatro", correo: `viajero4${id}@e2e.com`, password: "ClaveE2E123" };
  const ayer = diaDentroDe(-1);
  const anteayer = diaDentroDe(-2);

  // El turista hace dos reservas y el prestador las confirma
  const page = await abrirSesion(browser);
  await registrar(page, viajero, "turista");
  for (const dias of [4, 5]) {
    await page.goto(urlServicio);
    await page.locator('input[type="date"]').first().fill(diaDentroDe(dias));
    await page.getByRole("button", { name: "Reservar" }).click();
    await expect(page.getByText("Solicitud enviada")).toBeVisible();
  }
  await prestador.goto("/mi-negocio");
  const filas = prestador.locator("div.rounded-xl", { hasText: viajero.nombre });
  for (const dias of [4, 5]) {
    const fila = filas.filter({ hasText: diaDentroDe(dias) }).last();
    await fila.getByRole("button", { name: "Confirmar" }).click();
    await expect(fila).toContainText("Confirmada");
  }

  // Pasa el tiempo (se mueven las fechas a ayer y anteayer): dentro del plazo de gracia la reserva sigue confirmada
  const mover = (desde, hasta) => consultar(
    "UPDATE reservas SET fecha_servicio = $1 WHERE fecha_servicio = $2 AND turista_id = (SELECT id FROM usuarios WHERE correo = $3)",
    [hasta, desde, viajero.correo]
  );
  await mover(diaDentroDe(4), ayer);
  await mover(diaDentroDe(5), anteayer);

  await page.goto("/mis-reservas");
  await expect(page.getByText(/El prestador está registrando tu asistencia/).first()).toBeVisible();
  await expect(page.getByRole("button", { name: /Calificar experiencia/ })).toHaveCount(0);

  // El prestador marca «no asistió» en la de ayer y «asistió» en la de anteayer
  await prestador.goto("/mi-negocio");
  const deAyer = filas.filter({ hasText: ayer }).last();
  await expect(deAyer).toContainText("¿Asistió?");
  await deAyer.getByRole("button", { name: "No asistió" }).click();
  await confirmar(prestador, "Sí, no asistió");
  await expect(deAyer).toContainText("No asistió");
  await expect(deAyer.getByRole("button", { name: "Asistió", exact: true })).toHaveCount(0);

  const deAnteayer = filas.filter({ hasText: anteayer }).last();
  await deAnteayer.getByRole("button", { name: "Asistió", exact: true }).click();
  await expect(deAnteayer).toContainText("Completada");

  // El turista ve el resultado: la que no asistió no se puede calificar; la que sí asistió, sí
  await page.goto("/mis-reservas");
  const noAsistida = page.getByRole("article").filter({ hasText: "NO ASISTIÓ" });
  await expect(noAsistida).toContainText("registró que no asististe");
  await expect(noAsistida.getByRole("button", { name: /Calificar experiencia/ })).toHaveCount(0);
  const completada = page.getByRole("article").filter({ hasText: SERVICIO }).filter({ hasText: "COMPLETADA" }).filter({ hasText: anteayer.slice(8) });
  await expect(completada.getByRole("button", { name: /Calificar experiencia/ })).toBeVisible();

  // Sin comisión ni ingreso por la que no asistió
  const { rows } = await consultar(
    "SELECT estado, comision FROM reservas WHERE fecha_servicio = $1 AND turista_id = (SELECT id FROM usuarios WHERE correo = $2)",
    [ayer, viajero.correo]
  );
  expect(rows[0]).toEqual({ estado: "no_asistio", comision: null });
});

test("22. la sesión vive en una cookie HttpOnly: ningún script la ve, sobrevive a recargar y se borra al salir", async ({ browser }) => {
  const page = await abrirSesion(browser);
  const usuario = { nombre: "Cookie E2E", correo: `cookie${id}@e2e.com`, password: "ClaveE2E123" };
  await registrar(page, usuario, "turista");

  // El navegador tiene la cookie, pero JavaScript no puede leerla ni hay un token en el almacenamiento local
  const cookies = await page.context().cookies();
  const sesion = cookies.find((c) => c.name === "publitours_sesion");
  expect(sesion?.httpOnly).toBe(true);
  expect(sesion?.sameSite).toBe("Lax");
  const visibleParaScripts = await page.evaluate(() => ({ cookie: document.cookie, almacenamiento: JSON.stringify({ ...localStorage }) }));
  expect(visibleParaScripts.cookie).not.toContain("publitours_sesion");
  expect(visibleParaScripts.almacenamiento).not.toMatch(/eyJ/); // un JWT empieza así

  // Recargar mantiene la sesión (la cookie viaja sola)
  await page.reload();
  await expect(page.getByRole("link", { name: "Mis Reservas" })).toBeVisible();

  // Salir borra la cookie en el servidor y las rutas protegidas vuelven a pedir iniciar sesión
  await page.getByRole("button", { name: new RegExp(usuario.nombre) }).click();
  await page.getByRole("button", { name: /Cerrar sesión/ }).click();
  await expect.poll(async () => (await page.context().cookies()).some((c) => c.name === "publitours_sesion" && c.value)).toBe(false);
  await page.goto("/mis-reservas");
  await expect(page).toHaveURL(/\/login/);
});

test("23. un itinerario se comparte con un enlace público de solo lectura y se puede revocar", async ({ browser }) => {
  const page = await abrirSesion(browser);
  await registrar(page, { nombre: "Compartidora E2E", correo: `compartidora${id}@e2e.com`, password: "ClaveE2E123" }, "turista");
  await page.goto("/itinerario");
  await page.getByPlaceholder("Presupuesto total (COP)").fill("300000");
  await page.getByPlaceholder("Días de viaje").fill("1");
  await page.getByLabel("Fecha de inicio").fill(diaDentroDe(25));
  await page.getByLabel("Número de personas").fill("2");
  await page.getByRole("button", { name: "Generar itinerario" }).click();
  await expect(page.getByText("Tu itinerario personalizado en el Caquetá")).toBeVisible();

  // Crear el enlace
  await page.getByRole("button", { name: /Crear enlace para compartir/ }).click();
  const campo = page.getByLabel(/Enlace público/);
  await expect(campo).toBeVisible();
  const enlace = await campo.inputValue();
  expect(enlace).toMatch(/\/plan\/[A-Za-z0-9_-]{16,}$/);

  // Una persona anónima (otra sesión, sin cuenta) lo abre y ve el plan, pero ningún dato personal
  const anonima = await abrirSesion(browser);
  await anonima.goto(new URL(enlace).pathname);
  await expect(anonima.getByRole("heading", { name: "Un viaje por el Caquetá" })).toBeVisible();
  await expect(anonima.getByRole("heading", { name: SERVICIO })).toBeVisible();
  await expect(anonima.getByText("Compartidora E2E")).toHaveCount(0);
  await expect(anonima.getByText(/300\.000/)).toHaveCount(0); // el presupuesto no se comparte

  // La dueña lo revoca y el enlace deja de funcionar
  await page.getByRole("button", { name: /Dejar de compartir/ }).click();
  await expect(page.getByRole("button", { name: /Crear enlace para compartir/ })).toBeVisible();
  await anonima.reload();
  await expect(anonima.getByRole("heading", { name: "Este itinerario no está disponible" })).toBeVisible();
});

test("24. la página de ayuda es pública, está en el pie de página y usa las reglas reales de la plataforma", async ({ browser }) => {
  const page = await abrirSesion(browser);
  await page.goto("/");
  await page.getByRole("link", { name: "Preguntas frecuentes" }).click();
  await expect(page).toHaveURL(/\/ayuda$/);
  await expect(page.getByRole("heading", { level: 1, name: "Preguntas frecuentes" })).toBeVisible();

  await page.getByText("¿Puedo cancelar o cambiar la fecha?").click();
  await expect(page.getByText(/Estricta: gratis hasta 7 días antes/)).toBeVisible(); // viene de /configuracion, no de un texto fijo
  await page.getByText("¿Cómo y cuándo pago?").click();
  await expect(page.getByText(/no procesa pagos/)).toBeVisible();
});

test("25. el prestador atiende a un turista con el código del comprobante y registra su asistencia", async ({ browser }) => {
  const prestador = paginas.prestador;
  const viajero = { nombre: "Viajero Cinco", correo: `viajero5${id}@e2e.com`, password: "ClaveE2E123" };

  // El turista reserva y el prestador confirma
  const page = await abrirSesion(browser);
  await registrar(page, viajero, "turista");
  await page.goto(urlServicio);
  await page.locator('input[type="date"]').first().fill(diaDentroDe(6));
  await page.getByRole("button", { name: "Reservar" }).click();
  await expect(page.getByText("Solicitud enviada")).toBeVisible();
  await prestador.goto("/mi-negocio");
  const fila = prestador.locator("div.rounded-xl", { hasText: viajero.nombre }).filter({ hasText: diaDentroDe(6) }).last();
  await fila.getByRole("button", { name: "Confirmar" }).click();
  await expect(fila).toContainText("Confirmada");

  // Llega el día del servicio; el turista tiene su comprobante con el código del QR
  const hoy = diaDentroDe(0);
  await consultar("UPDATE reservas SET fecha_servicio = $1 WHERE turista_id = (SELECT id FROM usuarios WHERE correo = $2)", [hoy, viajero.correo]);
  const { rows } = await consultar("SELECT id, codigo FROM reservas WHERE turista_id = (SELECT id FROM usuarios WHERE correo = $1)", [viajero.correo]);
  const { id: reservaId, codigo } = rows[0];
  await page.goto(`/comprobante/${reservaId}`);
  await expect(page.getByText(codigo).first()).toBeVisible();

  // La "cámara" de la prueba mostrará una foto del QR REAL del comprobante (con su margen blanco, como en el papel)
  const qr = page.locator("svg").filter({ has: page.locator("path") }).locator("visible=true").last();
  const caja = await qr.boundingBox();
  await qr.evaluate((el) => { el.style.width = "360px"; el.style.height = "360px"; }); // más grande: así lo vería una cámara de cerca
  const grande = await qr.boundingBox();
  const margen = 60;
  const foto = await page.screenshot({ type: "jpeg", quality: 100, clip: { x: grande.x - margen, y: grande.y - margen, width: grande.width + 2 * margen, height: grande.height + 2 * margen } });
  expect(caja.width).toBeGreaterThan(0);
  fs.mkdirSync(path.dirname(VIDEO_CAMARA), { recursive: true });
  fs.writeFileSync(VIDEO_CAMARA, Buffer.concat(Array(40).fill(foto))); // un video MJPEG es una cadena de fotos JPEG

  // El prestador abre el escáner: la cámara de prueba le muestra el QR del comprobante y lo lee sola, sin escribir nada
  await prestador.goto("/mi-negocio");
  await prestador.getByRole("button", { name: /Escanear QR/ }).click();
  const ventana = prestador.getByRole("dialog", { name: /Atender con QR/ });
  await expect(ventana).toBeVisible();
  await expect(ventana.getByText(/Reserva válida. Registra si el turista asistió/)).toBeVisible({ timeout: 30_000 });
  await expect(ventana.getByText(viajero.nombre)).toBeVisible();
  await expect(ventana.getByText(codigo, { exact: true })).toBeVisible();
  await ventana.getByRole("button", { name: "Asistió", exact: true }).click();
  await expect(ventana.getByText(/asistencia de esta reserva ya quedó registrada/)).toBeVisible();
  await expect(ventana.getByRole("button", { name: "Asistió", exact: true })).toHaveCount(0);

  const { rows: despues } = await consultar("SELECT estado FROM reservas WHERE id = $1", [reservaId]);
  expect(despues[0].estado).toBe("completada");

  // Y el turista ya puede calificar
  await page.goto("/mis-reservas");
  await expect(page.getByRole("button", { name: /Calificar experiencia/ })).toBeVisible();
});

test("26. una turista le pregunta al negocio con una foto sin tener reserva; el negocio responde, reporta y la administración retira el mensaje", async ({ browser }) => {
  const prestador = paginas.prestador;
  const admin = paginas.admin;
  const turista = { nombre: "Mensajera E2E", correo: `mensajera${id}@e2e.com`, password: "ClaveE2E123" };
  const hilo = (p) => p.getByRole("region", { name: "Conversación abierta" });
  const PNG = Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR4nGP4z8DwHwAFAAH/q842iQAAAABJRU5ErkJggg==", "base64");

  // 1. Pregunta desde la página del servicio, sin reserva, con una foto
  const page = await abrirSesion(browser);
  await registrar(page, turista, "turista");
  await page.goto(urlServicio);
  await page.getByRole("button", { name: "Preguntar al negocio" }).click();
  const ventana = page.getByRole("dialog", { name: "Preguntar al negocio" });
  await ventana.getByLabel("Escribe tu mensaje").fill("¿Hay parqueadero para dos carros?");
  await ventana.getByTestId("selector-fotos").setInputFiles({ name: "camino.png", mimeType: "image/png", buffer: PNG });
  await ventana.getByRole("button", { name: /Enviar/ }).click();
  await expect(page).toHaveURL(/\/mensajes\/\d+$/);
  await expect(hilo(page).getByText("¿Hay parqueadero para dos carros?")).toBeVisible();
  await expect(hilo(page).getByRole("link", { name: new RegExp(`Servicio: ${SERVICIO}`) })).toBeVisible(); // el tema de la pregunta

  // La foto se entrega por la ruta privada, con la sesión: si el navegador la pudo mostrar, la cookie viajó
  const foto = hilo(page).getByAltText("Foto enviada en la conversación");
  await expect.poll(() => foto.evaluate((i) => i.naturalWidth)).toBeGreaterThan(0);
  const urlFoto = await foto.getAttribute("src");
  expect(urlFoto).toMatch(/\/conversaciones\/imagenes\/\d+$/);
  expect(urlFoto).not.toContain("/uploads/");

  // 2. El negocio ve el aviso y el contador, abre la conversación y responde
  await prestador.goto("/mi-negocio");
  await expect(prestador.getByRole("link", { name: /Mensajes: \d+ sin leer/ })).toBeVisible();
  await prestador.getByRole("link", { name: /Mensajes/ }).click();
  await prestador.getByRole("link", { name: new RegExp(turista.nombre) }).click();
  await expect(hilo(prestador).getByText("¿Hay parqueadero para dos carros?")).toBeVisible();
  await expect(hilo(prestador).getByText("Cliente")).toBeVisible();
  await prestador.getByLabel("Escribe tu mensaje").fill("Sí, hay espacio para dos carros.");
  await prestador.getByRole("button", { name: /Enviar/ }).click();
  await expect(hilo(prestador).getByText("Sí, hay espacio para dos carros.")).toBeVisible();
  await expect(prestador.getByRole("link", { name: "Mensajes" })).toBeVisible(); // al abrirla se leyó: el contador desaparece

  // 3. La respuesta le llega sola a la turista, sin recargar la página
  await expect(hilo(page).getByText("Sí, hay espacio para dos carros.")).toBeVisible({ timeout: 25_000 });

  // 4. La foto es privada: ni anónimo ni otra persona la ven
  const anonimo = await browser.newContext();
  expect((await anonimo.request.get(urlFoto)).status()).toBe(401);
  const otra = await abrirSesion(browser);
  await registrar(otra, { nombre: "Curiosa E2E", correo: `curiosa${id}@e2e.com`, password: "ClaveE2E123" }, "turista");
  expect((await otra.request.get(urlFoto)).status()).toBe(404);
  expect((await otra.request.get(`http://localhost:4100/uploads/privado/mensajes/${urlFoto.split("/").pop()}.png`)).status()).toBe(404);

  // 5. El negocio reporta el mensaje de la turista
  await hilo(prestador).getByRole("button", { name: "Reportar este mensaje" }).click();
  const reporte = prestador.getByRole("dialog", { name: "Reportar mensaje" });
  await reporte.getByLabel("Motivo").selectOption({ label: "Pide datos personales o pagos de forma sospechosa" });
  await reporte.getByRole("button", { name: "Enviar reporte" }).click();
  await expect(reporte.getByText("La administración revisará este mensaje.")).toBeVisible();

  // 6. La administración ve solo ese mensaje (con su foto, aunque no participa) y lo retira
  await admin.goto("/admin");
  await admin.getByRole("button", { name: "Mensajes reportados" }).click();
  const tarjeta = admin.getByRole("article").filter({ hasText: "¿Hay parqueadero para dos carros?" });
  await expect(tarjeta).toBeVisible();
  await expect(tarjeta.getByText("Sí, hay espacio para dos carros.")).toHaveCount(0); // el resto de la conversación no se muestra
  await expect.poll(() => tarjeta.getByAltText("Foto reportada").evaluate((i) => i.naturalWidth)).toBeGreaterThan(0);
  await tarjeta.getByRole("button", { name: "Retirar mensaje" }).click();
  await confirmar(admin, "Retirar");
  await expect(admin.getByText("No hay mensajes reportados por revisar.")).toBeVisible();

  // 7. Para las dos partes el mensaje queda retirado y su foto ya no se entrega, ni siquiera a su autora
  await page.reload();
  await expect(hilo(page).getByText("Mensaje retirado por la administración.")).toBeVisible();
  await expect(hilo(page).getByAltText("Foto enviada en la conversación")).toHaveCount(0);
  expect((await page.request.get(urlFoto)).status()).toBe(404);
  await expect(hilo(page).getByText("Sí, hay espacio para dos carros.")).toBeVisible(); // lo demás de la conversación sigue

  await anonimo.close();

  // No dejar la foto de prueba en la carpeta privada del disco
  const { rows: fotos } = await consultar("SELECT archivo FROM mensaje_imagenes");
  for (const { archivo } of fotos) fs.rmSync(path.join(BACKEND_DIR, "public", "uploads", "privado", "mensajes", archivo), { force: true });
});
