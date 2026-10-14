"use strict";

// Precios flexibles (niños, temporadas, descuento por grupo), código de comprobante y recordatorios de reservas.
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn("sitios_turisticos", "precio_nino", { type: Sequelize.DECIMAL(10, 2), allowNull: true });
    await queryInterface.addColumn("sitios_turisticos", "grupo_min_personas", { type: Sequelize.INTEGER, allowNull: true });
    await queryInterface.addColumn("sitios_turisticos", "grupo_descuento_pct", { type: Sequelize.INTEGER, allowNull: true });

    await queryInterface.createTable("tarifas_temporada", {
      id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
      sitio_id: { type: Sequelize.INTEGER, allowNull: false, references: { model: "sitios_turisticos", key: "id" }, onDelete: "CASCADE" },
      nombre: { type: Sequelize.STRING(80), allowNull: false },
      fecha_desde: { type: Sequelize.DATEONLY, allowNull: false },
      fecha_hasta: { type: Sequelize.DATEONLY, allowNull: false },
      precio: { type: Sequelize.DECIMAL(10, 2), allowNull: false },
      precio_nino: { type: Sequelize.DECIMAL(10, 2), allowNull: true },
    });
    await queryInterface.addIndex("tarifas_temporada", ["sitio_id"]);

    await queryInterface.addColumn("reservas", "ninos", { type: Sequelize.INTEGER, allowNull: false, defaultValue: 0 });
    await queryInterface.addColumn("reservas", "codigo", { type: Sequelize.STRING(12), allowNull: true });
    await queryInterface.addColumn("reservas", "recordatorio_enviado_en", { type: Sequelize.DATE, allowNull: true });
    // Las reservas existentes reciben un código de comprobante.
    await queryInterface.sequelize.query(
      `UPDATE reservas SET codigo = 'PT-' || upper(substr(md5(id::text || random()::text), 1, 6)) WHERE codigo IS NULL`
    );
    await queryInterface.addConstraint("reservas", { fields: ["codigo"], type: "unique", name: "reservas_codigo_unico" });
  },
  async down(queryInterface) {
    await queryInterface.removeConstraint("reservas", "reservas_codigo_unico");
    await queryInterface.removeColumn("reservas", "recordatorio_enviado_en");
    await queryInterface.removeColumn("reservas", "codigo");
    await queryInterface.removeColumn("reservas", "ninos");
    await queryInterface.dropTable("tarifas_temporada");
    await queryInterface.removeColumn("sitios_turisticos", "grupo_descuento_pct");
    await queryInterface.removeColumn("sitios_turisticos", "grupo_min_personas");
    await queryInterface.removeColumn("sitios_turisticos", "precio_nino");
  },
};
