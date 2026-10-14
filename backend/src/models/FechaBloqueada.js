const { DataTypes } = require("sequelize");
const sequelize = require("../config/database");

// Fecha en la que el prestador no atiende un servicio (mantenimiento, evento privado, etc.).
const FechaBloqueada = sequelize.define("FechaBloqueada", {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  sitio_id: { type: DataTypes.INTEGER, allowNull: false },
  fecha: { type: DataTypes.DATEONLY, allowNull: false },
  motivo: { type: DataTypes.STRING(150), allowNull: true },
}, { tableName: "fechas_bloqueadas", timestamps: false });

module.exports = FechaBloqueada;
