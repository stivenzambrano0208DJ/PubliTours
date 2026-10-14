"use strict";

// Índices para las consultas más frecuentes (disponibilidad por fecha, "mis reservas", panel del prestador, notificaciones,
// catálogo público). Solo agregan estructura de lectura: no cambian ni borran datos. IF NOT EXISTS hace la migración repetible.
const INDICES = [
  ["idx_reservas_sitio_fecha_estado", "reservas", "(sitio_id, fecha_servicio, estado)"],
  ["idx_reservas_turista", "reservas", "(turista_id, fecha_solicitud DESC)"],
  ["idx_reservas_prestador_estado", "reservas", "(prestador_id, estado)"],
  ["idx_notificaciones_usuario_fecha", "notificaciones", "(usuario_id, fecha DESC)"],
  ["idx_sitios_estado_prestador", "sitios_turisticos", "(estado, prestador_id)"],
];

module.exports = {
  async up(queryInterface) {
    for (const [nombre, tabla, columnas] of INDICES) {
      await queryInterface.sequelize.query(`CREATE INDEX IF NOT EXISTS ${nombre} ON ${tabla} ${columnas}`);
    }
  },
  async down(queryInterface) {
    for (const [nombre] of INDICES) await queryInterface.sequelize.query(`DROP INDEX IF EXISTS ${nombre}`);
  },
};
