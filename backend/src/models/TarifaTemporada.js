const { DataTypes } = require("sequelize");
const sequelize = require("../config/database");

// Tarifa distinta para un rango de fechas (temporada alta, feriados, etc.). Si una fecha cae en una temporada, manda su precio.
const TarifaTemporada = sequelize.define("TarifaTemporada", {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  sitio_id: { type: DataTypes.INTEGER, allowNull: false },
  nombre: { type: DataTypes.STRING(80), allowNull: false },
  fecha_desde: { type: DataTypes.DATEONLY, allowNull: false },
  fecha_hasta: { type: DataTypes.DATEONLY, allowNull: false },
  precio: { type: DataTypes.DECIMAL(10, 2), allowNull: false },
  precio_nino: { type: DataTypes.DECIMAL(10, 2), allowNull: true },
}, { tableName: "tarifas_temporada", timestamps: false });

module.exports = TarifaTemporada;
