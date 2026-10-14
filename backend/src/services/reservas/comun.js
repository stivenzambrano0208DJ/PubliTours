const { Op } = require("sequelize");
const { Reserva, SitioTuristico, Prestador, FechaBloqueada, Paquete, PaqueteItem } = require("../../models");
const { hoyLocal } = require("../../utils/fechas");
const { ErrorHttp } = require("../../utils/errores");
const politicas = require("../../politicas");


// Una reserva puede ser de un servicio o de un paquete (en ese caso sitio_id guarda el primer servicio como ancla).
const INCLUDE_RESERVA = [
  { model: SitioTuristico, as: "sitio" },
  { model: Paquete, as: "paquete", include: [{ model: PaqueteItem, as: "items", include: [{ model: SitioTuristico, as: "sitio", attributes: ["id", "nombre", "municipio", "categoria", "imagen_url", "estado"] }] }] },
];
const etiqueta = (reserva) => (reserva.paquete ? `el paquete "${reserva.paquete.nombre}"` : `"${reserva.sitio.nombre}"`);

// RN-07: el prestador solo gestiona reservas de su propio negocio.
async function exigirPrestadorDeReserva(reserva, usuarioPrestadorId, transaction = undefined) {
  const prestador = await Prestador.findByPk(reserva.prestador_id, { transaction });
  politicas.reservas.exigirGestionarReserva(usuarioPrestadorId, prestador);
  return prestador;
}

// La fecha no puede estar bloqueada por el prestador en ninguno de los servicios involucrados.
async function validarFechaNoBloqueada(sitioIds, fecha_servicio) {
  const bloqueo = await FechaBloqueada.findOne({ where: { sitio_id: sitioIds, fecha: fecha_servicio } });
  if (bloqueo) {
    throw new ErrorHttp(400, `El prestador no atiende ese día${bloqueo.motivo ? ` (${bloqueo.motivo})` : ""}. Elige otra fecha.`);
  }
}

// RN-03 con cupos: sin capacidad definida solo cabe una reserva confirmada por fecha;
// con capacidad, la suma de personas confirmadas ese día no puede superarla.
// `filtro` identifica lo reservado: { sitio_id } o { paquete_id }.
async function validarCupo({ capacidad, filtro }, fecha_servicio, personas, excluirReservaId = null, transaction = undefined) {
  const where = { ...filtro, fecha_servicio, estado: "confirmada" };
  if (excluirReservaId) where.id = { [Op.ne]: excluirReservaId };
  const confirmadas = await Reserva.findAll({ where, attributes: ["personas"], transaction });

  if (!capacidad) {
    if (confirmadas.length > 0) {
      throw new ErrorHttp(400, "No hay disponibilidad: ya existe una reserva confirmada para esa fecha.");
    }
    return;
  }
  const ocupados = confirmadas.reduce((s, r) => s + r.personas, 0);
  if (ocupados + personas > capacidad) {
    const libres = Math.max(0, capacidad - ocupados);
    throw new ErrorHttp(400, `No hay cupos suficientes para ese día: quedan ${libres} de ${capacidad}.`);
  }
}

function validarFechaYPersonas(fecha_servicio, personas, capacidad, nombreCosa) {
  if (fecha_servicio <= hoyLocal()) throw new ErrorHttp(400, "La fecha del servicio debe ser posterior a hoy.");
  if (capacidad && personas > capacidad) {
    throw new ErrorHttp(400, `${nombreCosa} atiende máximo ${capacidad} persona(s) por día.`);
  }
}

module.exports = { hoyLocal, INCLUDE_RESERVA, etiqueta, exigirPrestadorDeReserva, validarFechaNoBloqueada, validarCupo, validarFechaYPersonas };
