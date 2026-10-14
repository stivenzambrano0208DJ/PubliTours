const { DataTypes } = require("sequelize");
const sequelize = require("../config/database");

// Código de 6 dígitos (guardado solo como hash) para confirmar que el correo del usuario es real.
const CodigoVerificacion = sequelize.define("CodigoVerificacion", {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  usuario_id: { type: DataTypes.INTEGER, allowNull: false },
  codigo_hash: { type: DataTypes.STRING(64), allowNull: false },
  expira: { type: DataTypes.DATE, allowNull: false },
  intentos: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
  usado: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
  fecha_creacion: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
}, { tableName: "codigos_verificacion", timestamps: false });

module.exports = CodigoVerificacion;
