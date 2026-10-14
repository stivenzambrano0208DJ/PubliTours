const { Auditoria, Usuario } = require("../models");
const logger = require("../utils/logger");

// Registra una acción de administración. Nunca debe romper la acción original: si falla, solo se informa en consola.
async function registrar({ actor_id, accion, entidad, entidad_id = null, detalle = null }) {
  try {
    await Auditoria.create({ actor_id, accion, entidad, entidad_id, detalle });
  } catch (err) {
    logger.error("No se pudo registrar la auditoría", err);
  }
}

// Historial de acciones, de la más reciente a la más antigua, con paginación y filtro opcional por acción.
async function listar({ page, limit, accion }) {
  const pageNum = Math.max(1, parseInt(page, 10) || 1);
  const limitNum = Math.min(100, Math.max(1, parseInt(limit, 10) || 25));
  const { count, rows } = await Auditoria.findAndCountAll({
    where: accion ? { accion } : {},
    include: [{ model: Usuario, as: "actor", attributes: ["id", "nombre"] }],
    order: [["fecha", "DESC"], ["id", "DESC"]],
    limit: limitNum,
    offset: (pageNum - 1) * limitNum,
  });
  return { total: count, page: pageNum, limit: limitNum, total_paginas: Math.ceil(count / limitNum), resultados: rows };
}

module.exports = { registrar, listar };
