const { DataTypes } = require("sequelize");
const sequelize = require("../config/database");

const ItinerarioItem = sequelize.define("ItinerarioItem", {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  itinerario_id: { type: DataTypes.INTEGER, allowNull: false },
  sitio_id: { type: DataTypes.INTEGER, allowNull: false },
  dia: { type: DataTypes.INTEGER, allowNull: false },
  orden: { type: DataTypes.INTEGER, allowNull: false },
  score: { type: DataTypes.DECIMAL(5, 2), allowNull: false },
  justificacion: { type: DataTypes.TEXT, allowNull: true }, // RF-08
}, {
  tableName: "itinerario_items",
  timestamps: false,
});

module.exports = ItinerarioItem;
