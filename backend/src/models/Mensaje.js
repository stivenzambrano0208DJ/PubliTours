const { DataTypes } = require("sequelize");
const sequelize = require("../config/database");

const Mensaje = sequelize.define("Mensaje", {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  conversacion_id: { type: DataTypes.INTEGER, allowNull: false },
  autor_id: { type: DataTypes.INTEGER, allowNull: false },
  texto: { type: DataTypes.TEXT, allowNull: true },
  sitio_id: { type: DataTypes.INTEGER, allowNull: true }, // sobre qué servicio, paquete o reserva se pregunta (solo en el mensaje que abre ese tema)
  paquete_id: { type: DataTypes.INTEGER, allowNull: true },
  reserva_id: { type: DataTypes.INTEGER, allowNull: true },
  creado_en: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
  retirado: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
}, { tableName: "mensajes", timestamps: false });

module.exports = Mensaje;
