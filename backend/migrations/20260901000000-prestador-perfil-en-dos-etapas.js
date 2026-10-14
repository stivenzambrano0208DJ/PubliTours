"use strict";

// Perfil del prestador en dos etapas: al registrarse deja lo básico ("incompleto"), luego completa el resto
// y lo envía a revisión ("pendiente"). Se agregan dirección y redes sociales.
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.sequelize.query(`ALTER TYPE "enum_prestadores_estado_verificacion" ADD VALUE IF NOT EXISTS 'incompleto'`);
    await queryInterface.addColumn("prestadores", "direccion", { type: Sequelize.STRING(200), allowNull: true });
    await queryInterface.addColumn("prestadores", "redes", { type: Sequelize.STRING(200), allowNull: true });
  },
  async down(queryInterface) {
    await queryInterface.removeColumn("prestadores", "redes");
    await queryInterface.removeColumn("prestadores", "direccion");
    // 'incompleto' permanece en el ENUM (PostgreSQL no permite quitar valores).
  },
};
