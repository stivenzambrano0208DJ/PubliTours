"use strict";

// Paquetes: combinación de varios servicios de un mismo prestador, con precio propio por persona.
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable("paquetes", {
      id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
      prestador_id: { type: Sequelize.INTEGER, allowNull: false, references: { model: "prestadores", key: "id" }, onDelete: "CASCADE" },
      nombre: { type: Sequelize.STRING(150), allowNull: false },
      descripcion: { type: Sequelize.TEXT, allowNull: true },
      precio: { type: Sequelize.DECIMAL(10, 2), allowNull: false, defaultValue: 0 }, // por persona
      capacidad: { type: Sequelize.INTEGER, allowNull: true }, // personas por día; NULL = una reserva confirmada por fecha
      estado: { type: Sequelize.ENUM("activo", "inactivo", "archivado"), allowNull: false, defaultValue: "activo" },
      fecha_creacion: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.fn("NOW") },
    });

    await queryInterface.createTable("paquete_items", {
      id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
      paquete_id: { type: Sequelize.INTEGER, allowNull: false, references: { model: "paquetes", key: "id" }, onDelete: "CASCADE" },
      sitio_id: { type: Sequelize.INTEGER, allowNull: false, references: { model: "sitios_turisticos", key: "id" }, onDelete: "CASCADE" },
      dia: { type: Sequelize.INTEGER, allowNull: false, defaultValue: 1 },
      orden: { type: Sequelize.INTEGER, allowNull: false, defaultValue: 0 },
    });
    await queryInterface.addConstraint("paquete_items", { fields: ["paquete_id", "sitio_id"], type: "unique", name: "paquete_items_paquete_sitio_unico" });

    // Una reserva de paquete guarda su paquete; sitio_id queda como el primer servicio (ancla) para no romper listados.
    await queryInterface.addColumn("reservas", "paquete_id", {
      type: Sequelize.INTEGER, allowNull: true, references: { model: "paquetes", key: "id" }, onDelete: "SET NULL",
    });
  },

  async down(queryInterface) {
    await queryInterface.removeColumn("reservas", "paquete_id");
    await queryInterface.dropTable("paquete_items");
    await queryInterface.dropTable("paquetes");
    await queryInterface.sequelize.query(`DROP TYPE IF EXISTS "enum_paquetes_estado"`);
  },
};
