"use strict";

// Comisión estimada por reserva. Se guarda el porcentaje y el valor del momento en que el prestador confirma,
// para que cambiar el porcentaje más adelante no reescriba el historial. Hoy es una estimación: no se cobra.
const PORCENTAJE_INICIAL = 10;

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn("reservas", "comision_pct", { type: Sequelize.DECIMAL(4, 1), allowNull: true });
    await queryInterface.addColumn("reservas", "comision", { type: Sequelize.DECIMAL(12, 2), allowNull: true });
    // Las reservas ya aceptadas reciben la comisión con el porcentaje vigente al crear esta función.
    await queryInterface.sequelize.query(
      `UPDATE reservas SET comision_pct = ${PORCENTAJE_INICIAL}, comision = ROUND(total * ${PORCENTAJE_INICIAL} / 100, 2) WHERE estado IN ('confirmada', 'completada')`
    );
  },
  async down(queryInterface) {
    await queryInterface.removeColumn("reservas", "comision");
    await queryInterface.removeColumn("reservas", "comision_pct");
  },
};
