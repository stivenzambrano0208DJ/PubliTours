"use strict";

// Enlace público de solo lectura para compartir un itinerario. NULL = no compartido (todos los existentes parten así).
// El token es largo y aleatorio: quien no tiene el enlace no puede deducirlo. El dueño lo puede revocar en cualquier momento.
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn("itinerarios", "token_publico", { type: Sequelize.STRING(64), allowNull: true, unique: true });
  },
  async down(queryInterface) {
    await queryInterface.removeColumn("itinerarios", "token_publico");
  },
};
