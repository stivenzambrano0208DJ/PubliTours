"use strict";

// Política de cancelación por servicio y paquete (la elige el prestador). Cada reserva guarda la política con la que se
// hizo y si el turista canceló una reserva confirmada fuera de plazo. Lo existente queda "flexible": el comportamiento de antes.
const POLITICAS = ["flexible", "moderada", "estricta"];

module.exports = {
  async up(queryInterface, Sequelize) {
    const columna = { type: Sequelize.STRING(12), allowNull: false, defaultValue: "flexible" };
    for (const tabla of ["sitios_turisticos", "paquetes", "reservas"]) {
      await queryInterface.addColumn(tabla, "politica_cancelacion", columna);
      await queryInterface.addConstraint(tabla, {
        fields: ["politica_cancelacion"], type: "check", name: `${tabla}_politica_cancelacion_valida`,
        where: { politica_cancelacion: POLITICAS },
      });
    }
    await queryInterface.addColumn("reservas", "cancelacion_tardia", { type: Sequelize.BOOLEAN, allowNull: false, defaultValue: false });
  },
  async down(queryInterface) {
    await queryInterface.removeColumn("reservas", "cancelacion_tardia");
    for (const tabla of ["reservas", "paquetes", "sitios_turisticos"]) {
      await queryInterface.removeConstraint(tabla, `${tabla}_politica_cancelacion_valida`);
      await queryInterface.removeColumn(tabla, "politica_cancelacion");
    }
  },
};
