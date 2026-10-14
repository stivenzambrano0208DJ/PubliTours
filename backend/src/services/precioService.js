const { TarifaTemporada } = require("../models");
const { ErrorHttp } = require("../utils/errores");

const redondear = (n) => Math.round(Number(n));

// La temporada que cubre la fecha (si hay varias, la que empezó más tarde: la más específica).
function temporadaDeFecha(tarifas, fecha) {
  return tarifas
    .filter((t) => fecha >= t.fecha_desde && fecha <= t.fecha_hasta)
    .sort((a, b) => (a.fecha_desde < b.fecha_desde ? 1 : -1))[0] || null;
}

// Calcula cuánto cuesta un servicio para una fecha y un grupo. Es la única fuente de verdad del total de una reserva:
//  - precio de adulto y de niño (de la temporada si la fecha cae en una; si no, el precio base)
//  - si la temporada no define precio de niño, los niños pagan el precio de adulto de esa temporada
//  - descuento por grupo: desde N personas, X % sobre el subtotal
async function cotizar(sitio, { fecha, personas = 1, ninos = 0 }) {
  if (ninos < 0 || ninos > personas - 1) {
    throw new ErrorHttp(400, "Debe haber al menos un adulto en la reserva; los niños no pueden ser todas las personas.");
  }
  const tarifas = sitio.tarifas || (await TarifaTemporada.findAll({ where: { sitio_id: sitio.id } }));
  const temporada = temporadaDeFecha(tarifas, fecha);

  const precioAdulto = Number(temporada ? temporada.precio : sitio.precio);
  const precioNino = temporada
    ? Number(temporada.precio_nino ?? temporada.precio)
    : Number(sitio.precio_nino ?? sitio.precio);

  const adultos = personas - ninos;
  const subtotal = adultos * precioAdulto + ninos * precioNino;
  const aplicaGrupo = Boolean(sitio.grupo_min_personas && sitio.grupo_descuento_pct && personas >= sitio.grupo_min_personas);
  const descuentoPct = aplicaGrupo ? Number(sitio.grupo_descuento_pct) : 0;
  const descuento = redondear((subtotal * descuentoPct) / 100);

  return {
    precio_adulto: precioAdulto,
    precio_nino: precioNino,
    adultos,
    ninos,
    subtotal: redondear(subtotal),
    descuento_pct: descuentoPct,
    descuento,
    total: redondear(subtotal) - descuento,
    temporada: temporada ? temporada.nombre : null,
  };
}

module.exports = { cotizar };
