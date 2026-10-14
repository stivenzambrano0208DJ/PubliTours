const test = require("node:test");
const assert = require("node:assert/strict");
const { calcularScore } = require("../src/services/itinerarioService");

const ctx = { preferenciasTags: ["naturaleza", "familia"], presupuestoPorDia: 100000 };
const sitio = (o) => ({ precio: 50000, tipo_viaje: "", descripcion: "", horario: "", ...o });

test("suma por coincidencia de intereses y explica el porqué", () => {
  const { score, detalles } = calcularScore(sitio({ tipo_viaje: "naturaleza,familia" }), ctx);
  assert.ok(score > calcularScore(sitio({ tipo_viaje: "negocios" }), ctx).score);
  assert.ok(detalles.some((d) => d.includes("naturaleza")));
});

test("penaliza lo que excede el presupuesto diario y nunca baja de cero", () => {
  const { score } = calcularScore(sitio({ precio: 900000 }), ctx);
  assert.equal(score, 0);
});

test("prioriza actividades gratuitas y con información completa (RN-06)", () => {
  const gratis = calcularScore(sitio({ precio: 0, descripcion: "x", horario: "8am" }), ctx);
  const pago = calcularScore(sitio({ precio: 50000 }), ctx);
  assert.ok(gratis.score > pago.score);
});
