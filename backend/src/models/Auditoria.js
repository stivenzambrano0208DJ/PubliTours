const { DataTypes } = require("sequelize");
const sequelize = require("../config/database");

// Quién hizo qué y cuándo (acciones de administración). El detalle es texto legible, nunca datos sensibles.
const Auditoria = sequelize.define("Auditoria", {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  actor_id: { type: DataTypes.INTEGER, allowNull: true },
  accion: { type: DataTypes.STRING(50), allowNull: false },
  entidad: { type: DataTypes.STRING(30), allowNull: false },
  entidad_id: { type: DataTypes.INTEGER, allowNull: true },
  detalle: { type: DataTypes.TEXT, allowNull: true },
  fecha: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
}, {
  tableName: "auditoria",
  timestamps: false,
});

module.exports = Auditoria;
