const { DataTypes } = require("sequelize");
const sequelize = require("../config/database");

const PaqueteItem = sequelize.define("PaqueteItem", {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  paquete_id: { type: DataTypes.INTEGER, allowNull: false },
  sitio_id: { type: DataTypes.INTEGER, allowNull: false },
  dia: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 1 },
  orden: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
}, { tableName: "paquete_items", timestamps: false });

module.exports = PaqueteItem;
