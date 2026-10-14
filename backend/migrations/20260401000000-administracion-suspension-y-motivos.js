"use strict";

// Funciones del administrador: suspender cuentas y explicar el rechazo de un prestador.
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn("usuarios", "activo", { type: Sequelize.BOOLEAN, allowNull: false, defaultValue: true });
    await queryInterface.addColumn("prestadores", "motivo_rechazo", { type: Sequelize.TEXT, allowNull: true });
  },
  async down(queryInterface) {
    await queryInterface.removeColumn("prestadores", "motivo_rechazo");
    await queryInterface.removeColumn("usuarios", "activo");
  },
};
