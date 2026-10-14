"use strict";

// Eliminar cuenta: se anonimiza al usuario (no se borra la fila) para conservar el historial de reservas
// de los demás; eliminado_en distingue una cuenta eliminada por su dueño de una suspendida por un administrador.
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn("usuarios", "eliminado_en", { type: Sequelize.DATE, allowNull: true });
  },
  async down(queryInterface) {
    await queryInterface.removeColumn("usuarios", "eliminado_en");
  },
};
