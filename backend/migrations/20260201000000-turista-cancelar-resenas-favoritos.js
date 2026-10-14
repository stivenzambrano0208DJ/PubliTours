"use strict";

// Funciones del turista: cancelar reservas, reseñas de sitios y favoritos.
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.sequelize.query(`ALTER TYPE "enum_reservas_estado" ADD VALUE IF NOT EXISTS 'cancelada'`);

    await queryInterface.createTable("resenas", {
      id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
      sitio_id: { type: Sequelize.INTEGER, allowNull: false, references: { model: "sitios_turisticos", key: "id" }, onDelete: "CASCADE" },
      turista_id: { type: Sequelize.INTEGER, allowNull: false, references: { model: "usuarios", key: "id" }, onDelete: "CASCADE" },
      reserva_id: { type: Sequelize.INTEGER, allowNull: false, unique: true, references: { model: "reservas", key: "id" }, onDelete: "CASCADE" },
      calificacion: { type: Sequelize.INTEGER, allowNull: false },
      comentario: { type: Sequelize.TEXT, allowNull: true },
      fecha: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.fn("NOW") },
    });
    await queryInterface.addIndex("resenas", ["sitio_id"]);

    await queryInterface.createTable("favoritos", {
      id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
      usuario_id: { type: Sequelize.INTEGER, allowNull: false, references: { model: "usuarios", key: "id" }, onDelete: "CASCADE" },
      sitio_id: { type: Sequelize.INTEGER, allowNull: false, references: { model: "sitios_turisticos", key: "id" }, onDelete: "CASCADE" },
      fecha: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.fn("NOW") },
    });
    await queryInterface.addConstraint("favoritos", { fields: ["usuario_id", "sitio_id"], type: "unique", name: "favoritos_usuario_sitio_unico" });
  },

  async down(queryInterface) {
    await queryInterface.dropTable("favoritos");
    await queryInterface.dropTable("resenas");
    // Los valores de un ENUM de PostgreSQL no se pueden quitar; 'cancelada' permanece.
  },
};
