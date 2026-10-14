const { DataTypes } = require("sequelize");
const sequelize = require("../config/database");

const Itinerario = sequelize.define("Itinerario", {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  turista_id: { type: DataTypes.INTEGER, allowNull: false },
  fecha_creacion: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
  presupuesto: { type: DataTypes.DECIMAL(10, 2), allowNull: false },
  dias: { type: DataTypes.INTEGER, allowNull: false },
  fecha_inicio: { type: DataTypes.DATEONLY, allowNull: true }, // día 1 del plan; cada día siguiente es +1
  personas: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 1 },
  preferencias: { type: DataTypes.TEXT, allowNull: true }, // texto libre o tags separados por coma
  token_publico: { type: DataTypes.STRING(64), allowNull: true, unique: true }, // enlace público de solo lectura; null = no compartido
}, {
  tableName: "itinerarios",
  timestamps: false,
});

module.exports = Itinerario;
