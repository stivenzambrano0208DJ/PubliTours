"use strict";

// Más oferta y reseñas:
//  - sitios_turisticos.fecha_creacion: cuándo se publicó cada servicio (para la etiqueta «Nuevo» y el orden «Más recientes»).
//    Los servicios que ya existían quedan sin fecha: no se sabe cuándo se crearon y no se inventa. Solo los nuevos la reciben.
//  - reservas.recordatorio_resena_en: el recordatorio para calificar se envía una sola vez.
//  - invitaciones: los negocios que la administración invitó por correo.
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn("sitios_turisticos", "fecha_creacion", { type: Sequelize.DATE, allowNull: true });
    // El valor por defecto se pone DESPUÉS de crear la columna: así las filas existentes quedan vacías y no con la fecha de hoy.
    await queryInterface.sequelize.query("ALTER TABLE sitios_turisticos ALTER COLUMN fecha_creacion SET DEFAULT NOW()");
    await queryInterface.addIndex("sitios_turisticos", ["fecha_creacion"], { name: "idx_sitios_fecha_creacion" });

    await queryInterface.addColumn("reservas", "recordatorio_resena_en", { type: Sequelize.DATE, allowNull: true });

    await queryInterface.createTable("invitaciones", {
      id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
      correo: { type: Sequelize.STRING(150), allowNull: false },
      nombre_negocio: { type: Sequelize.STRING(150), allowNull: true },
      enviada_por: { type: Sequelize.INTEGER, allowNull: true, references: { model: "usuarios", key: "id" }, onDelete: "SET NULL" },
      enviada_en: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.fn("NOW") },
    });
    await queryInterface.addIndex("invitaciones", ["correo"], { name: "idx_invitaciones_correo" });
    await queryInterface.addIndex("invitaciones", ["enviada_por", "enviada_en"], { name: "idx_invitaciones_enviada_por" });
  },

  async down(queryInterface) {
    await queryInterface.dropTable("invitaciones");
    await queryInterface.removeColumn("reservas", "recordatorio_resena_en");
    await queryInterface.removeIndex("sitios_turisticos", "idx_sitios_fecha_creacion");
    await queryInterface.removeColumn("sitios_turisticos", "fecha_creacion");
  },
};
