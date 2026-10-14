"use strict";

// Versión de sesión: cada token lleva la versión que tenía la cuenta al iniciarse. Al cambiar o restablecer la contraseña
// la versión sube y los tokens anteriores dejan de valer (antes seguían activos hasta que vencían). Las cuentas existentes
// parten en 0, igual que los tokens ya emitidos sin versión: nadie queda desconectado por esta migración.
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn("usuarios", "token_version", { type: Sequelize.INTEGER, allowNull: false, defaultValue: 0 });
  },
  async down(queryInterface) {
    await queryInterface.removeColumn("usuarios", "token_version");
  },
};
