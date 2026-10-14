"use strict";

// Límite de intentos para el código de recuperación (evita fuerza bruta sobre 6 dígitos).
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn("password_resets", "intentos", {
      type: Sequelize.INTEGER, allowNull: false, defaultValue: 0,
    });
  },
  async down(queryInterface) {
    await queryInterface.removeColumn("password_resets", "intentos");
  },
};
