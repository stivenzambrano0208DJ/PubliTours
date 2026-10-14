const test = require("node:test");
const assert = require("node:assert/strict");
const { auth, sitio, reserva, itinerario, prestador } = require("../src/validators/schemas");

test("registro: rechaza contraseña corta y correo inválido", () => {
  assert.equal(auth.registro.safeParse({ nombre: "Ana", correo: "ana@x.com", password: "123" }).success, false);
  assert.equal(auth.registro.safeParse({ nombre: "Ana", correo: "no-es-correo", password: "clave12345" }).success, false);
});

test("registro: normaliza correo y no permite rol administrador", () => {
  const r = auth.registro.safeParse({ nombre: "Ana", correo: " ANA@X.com ", password: "clave12345", rol: "administrador", acepta_terminos: true });
  assert.equal(r.success, true);
  assert.equal(r.data.correo, "ana@x.com");
  assert.equal(r.data.rol, "turista");
});

test("registro: exige aceptar los términos", () => {
  const base = { nombre: "Ana", correo: "a@b.com", password: "clave12345" };
  assert.equal(auth.registro.safeParse(base).success, false);
  assert.equal(auth.registro.safeParse({ ...base, acepta_terminos: false }).success, false);
  assert.equal(auth.registro.safeParse({ ...base, acepta_terminos: "true" }).success, false); // solo el booleano true
  assert.equal(auth.registro.safeParse({ ...base, acepta_terminos: true }).success, true);
});

test("restablecer: el código debe tener 6 dígitos", () => {
  const base = { correo: "a@b.com", password: "clave12345" };
  assert.equal(auth.restablecerPassword.safeParse({ ...base, codigo: "12345" }).success, false);
  assert.equal(auth.restablecerPassword.safeParse({ ...base, codigo: "12a456" }).success, false);
  assert.equal(auth.restablecerPassword.safeParse({ ...base, codigo: "012345" }).success, true);
});

test("sitio: convierte textos de formulario a números y vacíos a null", () => {
  const r = sitio.safeParse({ nombre: "Cascada", categoria: "Naturaleza", municipio: "Florencia", precio: "15000", latitud: "", longitud: "-75.6", horario: "" });
  assert.equal(r.success, true);
  assert.equal(r.data.precio, 15000);
  assert.equal(r.data.latitud, null);
  assert.equal(r.data.longitud, -75.6);
  assert.equal(r.data.horario, null);
});

test("sitio: rechaza precio negativo y latitud fuera de rango", () => {
  const base = { nombre: "X", categoria: "Y", municipio: "Z" };
  assert.equal(sitio.safeParse({ ...base, precio: -1 }).success, false);
  assert.equal(sitio.safeParse({ ...base, latitud: 95 }).success, false);
});

test("reserva e itinerario: validan formato y rangos", () => {
  assert.equal(reserva.safeParse({ sitio_id: 1, fecha_servicio: "26/09/2026" }).success, false);
  assert.equal(reserva.safeParse({ sitio_id: "3", fecha_servicio: "2026-09-26" }).success, true);
  assert.equal(itinerario.safeParse({ presupuesto: 0, dias: 2 }).success, false);
  assert.equal(itinerario.safeParse({ presupuesto: 500000, dias: 31 }).success, false);
  assert.equal(itinerario.safeParse({ presupuesto: "500000", dias: "3", municipio: "" }).data.municipio, undefined);
});

test("prestador: teléfono solo dígitos (7–15) y opcional", () => {
  const base = { nombre_negocio: "Finca", categoria: "Hospedaje", municipio: "Morelia" };
  assert.equal(prestador.safeParse({ ...base, telefono: "300-123" }).success, false);
  assert.equal(prestador.safeParse({ ...base, telefono: "3001234567" }).success, true);
  assert.equal(prestador.safeParse({ ...base, telefono: "" }).data.telefono, null);
});
