const { DataTypes } = require("sequelize");
const sequelize = require("../config/database");

// Un problema con una reserva que la turista o el negocio le reporta a la administración.
const CasoSoporte = sequelize.define("CasoSoporte", {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  reserva_id: { type: DataTypes.INTEGER, allowNull: false },
  abierto_por: { type: DataTypes.INTEGER, allowNull: false },
  motivo: { type: DataTypes.STRING(30), allowNull: false },
  detalle: { type: DataTypes.STRING(1000), allowNull: false },
  estado: { type: DataTypes.STRING(12), allowNull: false, defaultValue: "abierto" },
  respuesta: { type: DataTypes.STRING(1000), allowNull: true },
  atendido_por: { type: DataTypes.INTEGER, allowNull: true },
  creado_en: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
  actualizado_en: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
  resuelto_en: { type: DataTypes.DATE, allowNull: true },
}, { tableName: "casos_soporte", timestamps: false });

module.exports = CasoSoporte;
