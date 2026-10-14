"use strict";

// Estado "completada": una reserva confirmada cuya fecha de servicio ya pasó.
module.exports = {
  async up(queryInterface) {
    await queryInterface.sequelize.query(`ALTER TYPE "enum_reservas_estado" ADD VALUE IF NOT EXISTS 'completada'`);
  },
  async down() {
    // Los valores de un ENUM de PostgreSQL no se pueden quitar; 'completada' permanece.
  },
};
