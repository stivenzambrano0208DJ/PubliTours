const { DataTypes } = require("sequelize");
const sequelize = require("../config/database");

// Una conversación por pareja (turista, negocio). Guarda hasta qué mensaje leyó cada lado, para contar los pendientes.
const Conversacion = sequelize.define("Conversacion", {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  turista_id: { type: DataTypes.INTEGER, allowNull: false },
  prestador_id: { type: DataTypes.INTEGER, allowNull: false },
  creada_en: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
  ultimo_mensaje_en: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
  turista_leido_hasta: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
  prestador_leido_hasta: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
}, { tableName: "conversaciones", timestamps: false });

module.exports = Conversacion;
