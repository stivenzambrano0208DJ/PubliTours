const { DataTypes } = require("sequelize");
const sequelize = require("../config/database");

const Notificacion = sequelize.define("Notificacion", {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  usuario_id: { type: DataTypes.INTEGER, allowNull: false },
  tipo: { type: DataTypes.STRING(50), allowNull: false },
  mensaje: { type: DataTypes.TEXT, allowNull: false },
  leido: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
  fecha: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
}, {
  tableName: "notificaciones",
  timestamps: false,
});

module.exports = Notificacion;
