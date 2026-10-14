const { DataTypes } = require("sequelize");
const sequelize = require("../config/database");

const ImagenPaquete = sequelize.define("ImagenPaquete", {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  paquete_id: { type: DataTypes.INTEGER, allowNull: false },
  imagen_url: { type: DataTypes.STRING(255), allowNull: false },
  orden: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
}, { tableName: "imagenes_paquete", timestamps: false });

module.exports = ImagenPaquete;
