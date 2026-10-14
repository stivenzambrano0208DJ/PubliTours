const { DataTypes } = require("sequelize");
const sequelize = require("../config/database");

// Tabla separada para no alterar el esquema de "usuarios" (tabla existente con datos reales).
const PasswordReset = sequelize.define("PasswordReset", {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  usuario_id: { type: DataTypes.INTEGER, allowNull: false },
  token_hash: { type: DataTypes.STRING(255), allowNull: false },
  expira: { type: DataTypes.DATE, allowNull: false },
  usado: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
  intentos: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
  fecha_creacion: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
}, {
  tableName: "password_resets",
  timestamps: false,
});

module.exports = PasswordReset;
