const { Op } = require("sequelize");
const { Reserva, FechaBloqueada, SitioTuristico, Paquete, PaqueteItem } = require("../models");
const { hoyLocal } = require("../utils/fechas");

const dosDigitos = (n) => String(n).padStart(2, "0");

// Fechas "AAAA-MM-DD" de un mes (mes = "AAAA-MM").
function diasDelMes(mes) {
  const [a, m] = mes.split("-").map(Number);
  const ultimo = new Date(Date.UTC(a, m, 0)).getUTCDate();
  return Array.from({ length: ultimo }, (_, i) => `${mes}-${dosDigitos(i + 1)}`);
}

// Estado de cada día del mes para un servicio o un paquete:
//  libre | pocos (quedan pocos cupos) | completo | bloqueado | pasado.
// Sin capacidad definida cabe una sola reserva confirmada por fecha (misma regla que al confirmar).
async function calendario({ tipo, id, mes }) {
  let capacidad;
  let filtroReservas;
  let sitioIds;
  if (tipo === "paquete") {
    const paquete = await Paquete.findByPk(id, { include: [{ model: PaqueteItem, as: "items", attributes: ["sitio_id"] }] });
    if (!paquete) return null;
    capacidad = paquete.capacidad;
    filtroReservas = { paquete_id: paquete.id };
    sitioIds = paquete.items.map((i) => i.sitio_id);
  } else {
    const sitio = await SitioTuristico.findByPk(id);
    if (!sitio) return null;
    capacidad = sitio.capacidad;
    filtroReservas = { sitio_id: sitio.id, paquete_id: null };
    sitioIds = [sitio.id];
  }

  const dias = diasDelMes(mes);
  const rango = [dias[0], dias[dias.length - 1]];
  const [bloqueos, confirmadas] = await Promise.all([
    FechaBloqueada.findAll({ where: { sitio_id: sitioIds, fecha: { [Op.between]: rango } }, attributes: ["fecha", "motivo"], raw: true }),
    Reserva.findAll({ where: { ...filtroReservas, estado: "confirmada", fecha_servicio: { [Op.between]: rango } }, attributes: ["fecha_servicio", "personas"], raw: true }),
  ]);
  const bloqueadas = new Map(bloqueos.map((b) => [b.fecha, b.motivo]));
  const ocupados = new Map();
  for (const r of confirmadas) ocupados.set(r.fecha_servicio, (ocupados.get(r.fecha_servicio) || 0) + r.personas);

  const hoy = hoyLocal();
  return {
    mes,
    capacidad,
    dias: dias.map((fecha) => {
      if (fecha <= hoy) return { fecha, estado: "pasado" };
      if (bloqueadas.has(fecha)) return { fecha, estado: "bloqueado", motivo: bloqueadas.get(fecha) };
      const usados = ocupados.get(fecha) || 0;
      if (!capacidad) return { fecha, estado: usados > 0 ? "completo" : "libre" };
      const libres = Math.max(0, capacidad - usados);
      if (libres === 0) return { fecha, estado: "completo", cupos_libres: 0 };
      return { fecha, estado: libres <= Math.max(1, Math.ceil(capacidad * 0.25)) ? "pocos" : "libre", cupos_libres: libres };
    }),
  };
}

module.exports = { calendario };
