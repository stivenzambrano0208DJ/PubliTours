const { Op } = require("sequelize");
const { Reserva, SitioTuristico, Paquete } = require("../models");
const { perfilDe } = require("./prestadorService");
const { validarPeriodo, aISO } = require("../utils/periodo");
const { aCsv } = require("../utils/csv");
const { comisionPorcentaje } = require("../config/negocio");

const COBRADAS = ["confirmada", "completada"]; // generan ingreso

// Reservas del negocio cuyo servicio cae dentro del periodo.
async function reservasDelPeriodo(usuario_id, query) {
  const prestador = await perfilDe(usuario_id);
  const periodo = validarPeriodo(query);
  const reservas = await Reserva.findAll({
    where: { prestador_id: prestador.id, fecha_servicio: { [Op.between]: [periodo.desde, periodo.hasta] } },
    include: [{ model: SitioTuristico, as: "sitio", attributes: ["nombre"] }, { model: Paquete, as: "paquete", attributes: ["nombre"] }],
    order: [["fecha_servicio", "ASC"], ["id", "ASC"]],
  });
  return { periodo, reservas };
}

const nombreDe = (r) => (r.paquete ? r.paquete.nombre : r.sitio?.nombre) || "Servicio eliminado";

// Todos los números salen de las reservas reales del periodo.
async function estadisticas(usuario_id, query) {
  const { periodo, reservas } = await reservasDelPeriodo(usuario_id, query);

  const por_estado = { pendiente: 0, confirmada: 0, completada: 0, rechazada: 0, cancelada: 0, no_asistio: 0 };
  const meses = new Map();
  const servicios = new Map();
  let ingresos = 0;
  let comision = 0;
  let personas = 0;
  let cancelaciones_tardias = 0;

  for (const r of reservas) {
    por_estado[r.estado] += 1;
    if (r.cancelacion_tardia) cancelaciones_tardias += 1;
    const mes = r.fecha_servicio.slice(0, 7);
    const m = meses.get(mes) || { mes, solicitudes: 0, confirmadas: 0, ingresos: 0, comision: 0 };
    m.solicitudes += 1;
    if (COBRADAS.includes(r.estado)) {
      const total = Number(r.total);
      m.confirmadas += 1;
      const comisionReserva = Number(r.comision || 0); // la que se congeló al confirmar
      m.ingresos += total;
      m.comision += comisionReserva;
      ingresos += total;
      comision += comisionReserva;
      personas += r.personas;

      const clave = `${r.paquete_id ? "p" : "s"}${r.paquete_id || r.sitio_id}`;
      const s = servicios.get(clave) || { nombre: nombreDe(r), tipo: r.paquete_id ? "paquete" : "servicio", reservas: 0, personas: 0, ingresos: 0 };
      s.reservas += 1;
      s.personas += r.personas;
      s.ingresos += total;
      servicios.set(clave, s);
    }
    meses.set(mes, m);
  }

  const aceptadas = por_estado.confirmada + por_estado.completada; // las que generan ingreso
  // Quien no asistió igual fue aceptado por el prestador: cuenta para su tasa de aceptación, pero no como ingreso.
  const respondidas = aceptadas + por_estado.no_asistio + por_estado.rechazada;
  const cerradas = por_estado.completada + por_estado.no_asistio;
  return {
    periodo,
    totales: {
      solicitudes: reservas.length,
      confirmadas: aceptadas,
      ingresos,
      comision,
      neto: ingresos - comision,
      cancelaciones_tardias,
      comision_pct: comisionPorcentaje(), // el vigente hoy; cada reserva conserva el suyo
      personas,
      ticket_promedio: aceptadas ? Math.round(ingresos / aceptadas) : null,
      tasa_aceptacion: respondidas ? Math.round(((aceptadas + por_estado.no_asistio) / respondidas) * 100) : null, // % de las respondidas que se aceptaron
      tasa_no_asistencia: cerradas ? Math.round((por_estado.no_asistio / cerradas) * 100) : null, // % de las ya cerradas
      por_estado,
    },
    por_mes: [...meses.values()].sort((a, b) => a.mes.localeCompare(b.mes)),
    por_servicio: [...servicios.values()].sort((a, b) => b.ingresos - a.ingresos),
  };
}

// Comisión y neto estimados de una reserva; vacíos mientras no esté aceptada.
const montos = (r) => (COBRADAS.includes(r.estado) ? [Number(r.comision || 0), Number(r.total) - Number(r.comision || 0)] : ["", ""]);

// Una fila por reserva, sin datos personales del turista.
async function exportarCsv(usuario_id, query) {
  const { periodo, reservas } = await reservasDelPeriodo(usuario_id, query);
  const filas = [
    ["codigo", "fecha_servicio", "servicio", "tipo", "personas", "ninos", "total_cop", "comision_estimada_cop", "neto_estimado_cop", "estado", "fecha_solicitud"],
    ...reservas.map((r) => [
      r.codigo, r.fecha_servicio, nombreDe(r), r.paquete_id ? "paquete" : "servicio", r.personas, r.ninos, Number(r.total), ...montos(r), r.estado, aISO(new Date(r.fecha_solicitud)),
    ]),
  ];
  return {
    nombre: `reservas-${periodo.desde}-a-${periodo.hasta}.csv`,
    contenido: aCsv(filas),
  };
}

module.exports = { estadisticas, exportarCsv };
