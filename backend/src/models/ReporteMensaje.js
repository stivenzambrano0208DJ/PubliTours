const { DataTypes } = require("sequelize");
const sequelize = require("../config/database");

// Lo que una persona reporta de un mensaje para que la administración lo revise.
const ReporteMensaje = sequelize.define("ReporteMensaje", {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  mensaje_id: { type: DataTypes.INTEGER, allowNull: false },
  reportado_por: { type: DataTypes.INTEGER, allowNull: false },
  motivo: { type: DataTypes.STRING(30), allowNull: false },
  detalle: { type: DataTypes.STRING(300), allowNull: true },
  estado: { type: DataTypes.STRING(12), allowNull: false, defaultValue: "pendiente" },
  creado_en: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
  revisado_por: { type: DataTypes.INTEGER, allowNull: true },
  revisado_en: { type: DataTypes.DATE, allowNull: true },
}, { tableName: "reportes_mensaje", timestamps: false });

module.exports = ReporteMensaje;
