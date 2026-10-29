"use strict";

// Atención al cliente: casos de soporte sobre una reserva.
//  - casos_soporte: lo que la turista o el negocio de una reserva reporta a la administración, con su estado y la respuesta.
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable("casos_soporte", {
      id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
      reserva_id: { type: Sequelize.INTEGER, allowNull: false, references: { model: "reservas", key: "id" }, onDelete: "CASCADE" },
      abierto_por: { type: Sequelize.INTEGER, allowNull: false, references: { model: "usuarios", key: "id" }, onDelete: "CASCADE" },
      motivo: { type: Sequelize.STRING(30), allowNull: false },
      detalle: { type: Sequelize.STRING(1000), allowNull: false },
      estado: { type: Sequelize.STRING(12), allowNull: false, defaultValue: "abierto" }, // abierto | en_revision | resuelto
      respuesta: { type: Sequelize.STRING(1000), allowNull: true },
      atendido_por: { type: Sequelize.INTEGER, allowNull: true, references: { model: "usuarios", key: "id" }, onDelete: "SET NULL" },
      creado_en: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.fn("NOW") },
      actualizado_en: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.fn("NOW") },
      resuelto_en: { type: Sequelize.DATE, allowNull: true },
    });
    await queryInterface.addIndex("casos_soporte", ["estado", "creado_en"], { name: "idx_casos_soporte_estado" });
    await queryInterface.addIndex("casos_soporte", ["reserva_id"], { name: "idx_casos_soporte_reserva" });
    await queryInterface.addIndex("casos_soporte", ["abierto_por", "creado_en"], { name: "idx_casos_soporte_autor" });
    await queryInterface.addIndex("casos_soporte", ["atendido_por"], { name: "idx_casos_soporte_atendido_por" });
  },

  async down(queryInterface) {
    await queryInterface.dropTable("casos_soporte");
  },
};
