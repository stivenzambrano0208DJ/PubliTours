"use strict";

// Aceptación de términos (con versión y fecha) y verificación del correo con un código de 6 dígitos.
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn("usuarios", "correo_verificado", { type: Sequelize.BOOLEAN, allowNull: false, defaultValue: false });
    await queryInterface.addColumn("usuarios", "acepto_terminos_en", { type: Sequelize.DATE, allowNull: true });
    await queryInterface.addColumn("usuarios", "version_terminos", { type: Sequelize.STRING(20), allowNull: true });
    // Las cuentas que ya existían se consideran verificadas (no se les puede pedir un código de un registro anterior).
    await queryInterface.sequelize.query(`UPDATE usuarios SET correo_verificado = true`);

    await queryInterface.createTable("codigos_verificacion", {
      id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
      usuario_id: { type: Sequelize.INTEGER, allowNull: false, references: { model: "usuarios", key: "id" }, onDelete: "CASCADE" },
      codigo_hash: { type: Sequelize.STRING(64), allowNull: false },
      expira: { type: Sequelize.DATE, allowNull: false },
      intentos: { type: Sequelize.INTEGER, allowNull: false, defaultValue: 0 },
      usado: { type: Sequelize.BOOLEAN, allowNull: false, defaultValue: false },
      fecha_creacion: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.fn("NOW") },
    });
    await queryInterface.addIndex("codigos_verificacion", ["usuario_id"]);
  },
  async down(queryInterface) {
    await queryInterface.dropTable("codigos_verificacion");
    await queryInterface.removeColumn("usuarios", "version_terminos");
    await queryInterface.removeColumn("usuarios", "acepto_terminos_en");
    await queryInterface.removeColumn("usuarios", "correo_verificado");
  },
};
