"use strict";

// Itinerarios con fecha de inicio real y número de personas: cada día del plan corresponde a una fecha
// concreta y el presupuesto se reparte entre las personas del grupo.
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn("itinerarios", "fecha_inicio", { type: Sequelize.DATEONLY, allowNull: true });
    await queryInterface.addColumn("itinerarios", "personas", { type: Sequelize.INTEGER, allowNull: false, defaultValue: 1 });
  },
  async down(queryInterface) {
    await queryInterface.removeColumn("itinerarios", "personas");
    await queryInterface.removeColumn("itinerarios", "fecha_inicio");
  },
};
