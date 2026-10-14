"use strict";

// Galería propia del paquete (varias fotos), además de su portada.
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable("imagenes_paquete", {
      id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
      paquete_id: { type: Sequelize.INTEGER, allowNull: false, references: { model: "paquetes", key: "id" }, onDelete: "CASCADE" },
      imagen_url: { type: Sequelize.STRING(255), allowNull: false },
      orden: { type: Sequelize.INTEGER, allowNull: false, defaultValue: 0 },
    });
    await queryInterface.addIndex("imagenes_paquete", ["paquete_id"]);
  },
  async down(queryInterface) {
    await queryInterface.dropTable("imagenes_paquete");
  },
};
