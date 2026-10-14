"use strict";

// Historial de acciones del administrador (moderación, verificación, suspensiones y anuncios).
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable("auditoria", {
      id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
      actor_id: { type: Sequelize.INTEGER, allowNull: true, references: { model: "usuarios", key: "id" }, onDelete: "SET NULL" },
      accion: { type: Sequelize.STRING(50), allowNull: false },
      entidad: { type: Sequelize.STRING(30), allowNull: false },
      entidad_id: { type: Sequelize.INTEGER, allowNull: true },
      detalle: { type: Sequelize.TEXT, allowNull: true },
      fecha: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.fn("NOW") },
    });
    await queryInterface.addIndex("auditoria", ["fecha"]);
    await queryInterface.addIndex("auditoria", ["accion"]);
  },
  async down(queryInterface) {
    await queryInterface.dropTable("auditoria");
  },
};
