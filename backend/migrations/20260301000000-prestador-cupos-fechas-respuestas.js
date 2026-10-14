"use strict";

// Funciones del prestador: cupos y fechas bloqueadas, personas/total/nota en reservas,
// motivo de rechazo, respuestas a reseñas y archivado de servicios.
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.sequelize.query(`ALTER TYPE "enum_sitios_turisticos_estado" ADD VALUE IF NOT EXISTS 'archivado'`);

    // capacidad: máximo de personas por día. NULL = una sola reserva confirmada por fecha (regla RN-03 original).
    await queryInterface.addColumn("sitios_turisticos", "capacidad", { type: Sequelize.INTEGER, allowNull: true });

    await queryInterface.addColumn("reservas", "personas", { type: Sequelize.INTEGER, allowNull: false, defaultValue: 1 });
    await queryInterface.addColumn("reservas", "total", { type: Sequelize.DECIMAL(12, 2), allowNull: false, defaultValue: 0 });
    await queryInterface.addColumn("reservas", "nota", { type: Sequelize.TEXT, allowNull: true });
    await queryInterface.addColumn("reservas", "motivo_rechazo", { type: Sequelize.TEXT, allowNull: true });
    // Las reservas existentes (1 persona) conservan el precio actual del sitio como total.
    await queryInterface.sequelize.query(
      `UPDATE reservas r SET total = s.precio FROM sitios_turisticos s WHERE s.id = r.sitio_id`
    );

    await queryInterface.addColumn("resenas", "respuesta", { type: Sequelize.TEXT, allowNull: true });
    await queryInterface.addColumn("resenas", "fecha_respuesta", { type: Sequelize.DATE, allowNull: true });

    await queryInterface.createTable("fechas_bloqueadas", {
      id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
      sitio_id: { type: Sequelize.INTEGER, allowNull: false, references: { model: "sitios_turisticos", key: "id" }, onDelete: "CASCADE" },
      fecha: { type: Sequelize.DATEONLY, allowNull: false },
      motivo: { type: Sequelize.STRING(150), allowNull: true },
    });
    await queryInterface.addConstraint("fechas_bloqueadas", { fields: ["sitio_id", "fecha"], type: "unique", name: "fechas_bloqueadas_sitio_fecha_unica" });
  },

  async down(queryInterface) {
    await queryInterface.dropTable("fechas_bloqueadas");
    await queryInterface.removeColumn("resenas", "fecha_respuesta");
    await queryInterface.removeColumn("resenas", "respuesta");
    await queryInterface.removeColumn("reservas", "motivo_rechazo");
    await queryInterface.removeColumn("reservas", "nota");
    await queryInterface.removeColumn("reservas", "total");
    await queryInterface.removeColumn("reservas", "personas");
    await queryInterface.removeColumn("sitios_turisticos", "capacidad");
    // 'archivado' permanece en el ENUM (PostgreSQL no permite quitar valores).
  },
};
