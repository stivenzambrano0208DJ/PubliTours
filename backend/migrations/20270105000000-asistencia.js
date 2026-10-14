"use strict";

// Asistencia: el prestador registra si el turista asistió. Estado nuevo "no_asistio", marca de cierre automático
// (la reserva se completó sola porque nadie registró la asistencia) y fecha del recordatorio al prestador.
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.sequelize.query(`ALTER TYPE "enum_reservas_estado" ADD VALUE IF NOT EXISTS 'no_asistio'`);
    await queryInterface.addColumn("reservas", "cierre_automatico", { type: Sequelize.BOOLEAN, allowNull: false, defaultValue: false });
    await queryInterface.addColumn("reservas", "aviso_cierre_en", { type: Sequelize.DATE, allowNull: true });
    // Hasta ahora todas las reservas completadas se cerraron solas por fecha, sin que nadie registrara la asistencia.
    await queryInterface.sequelize.query(`UPDATE reservas SET cierre_automatico = true WHERE estado = 'completada'`);
  },
  async down(queryInterface) {
    // PostgreSQL no permite quitar un valor de un ENUM: las reservas no asistidas vuelven a "completada" y el valor queda sin uso.
    await queryInterface.sequelize.query(`UPDATE reservas SET estado = 'completada' WHERE estado = 'no_asistio'`);
    await queryInterface.removeColumn("reservas", "aviso_cierre_en");
    await queryInterface.removeColumn("reservas", "cierre_automatico");
  },
};
