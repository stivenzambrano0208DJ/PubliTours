"use strict";

// 1) Reseñas de paquetes, 2) estado "oculto" (moderación del administrador) para servicios y paquetes,
// 3) foto de portada propia del paquete.
module.exports = {
  async up(queryInterface, Sequelize) {
    // Reseñas: ahora pueden ser de un servicio O de un paquete
    await queryInterface.changeColumn("resenas", "sitio_id", { type: Sequelize.INTEGER, allowNull: true });
    await queryInterface.addColumn("resenas", "paquete_id", {
      type: Sequelize.INTEGER, allowNull: true, references: { model: "paquetes", key: "id" }, onDelete: "CASCADE",
    });
    await queryInterface.addIndex("resenas", ["paquete_id"]);
    await queryInterface.sequelize.query(
      `ALTER TABLE resenas ADD CONSTRAINT resenas_sitio_o_paquete CHECK (sitio_id IS NOT NULL OR paquete_id IS NOT NULL)`
    );

    // Moderación: "oculto" lo pone el administrador y el prestador no puede revertirlo
    await queryInterface.sequelize.query(`ALTER TYPE "enum_sitios_turisticos_estado" ADD VALUE IF NOT EXISTS 'oculto'`);
    await queryInterface.sequelize.query(`ALTER TYPE "enum_paquetes_estado" ADD VALUE IF NOT EXISTS 'oculto'`);
    await queryInterface.addColumn("sitios_turisticos", "motivo_moderacion", { type: Sequelize.TEXT, allowNull: true });
    await queryInterface.addColumn("paquetes", "motivo_moderacion", { type: Sequelize.TEXT, allowNull: true });

    await queryInterface.addColumn("paquetes", "imagen_url", { type: Sequelize.STRING(255), allowNull: true });
  },

  async down(queryInterface) {
    await queryInterface.removeColumn("paquetes", "imagen_url");
    await queryInterface.removeColumn("paquetes", "motivo_moderacion");
    await queryInterface.removeColumn("sitios_turisticos", "motivo_moderacion");
    await queryInterface.sequelize.query(`ALTER TABLE resenas DROP CONSTRAINT IF EXISTS resenas_sitio_o_paquete`);
    await queryInterface.removeColumn("resenas", "paquete_id");
    // sitio_id queda opcional y 'oculto' permanece en los ENUM (PostgreSQL no permite quitar valores).
  },
};
