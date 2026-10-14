const { DataTypes } = require("sequelize");
const sequelize = require("../config/database");

const Favorito = sequelize.define("Favorito", {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  usuario_id: { type: DataTypes.INTEGER, allowNull: false },
  sitio_id: { type: DataTypes.INTEGER, allowNull: false },
  fecha: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
}, { tableName: "favoritos", timestamps: false });

module.exports = Favorito;
