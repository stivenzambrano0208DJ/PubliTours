const { DataTypes } = require("sequelize");
const sequelize = require("../config/database");

const ImagenSitio = sequelize.define("ImagenSitio", {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  sitio_id: { type: DataTypes.INTEGER, allowNull: false },
  imagen_url: { type: DataTypes.STRING(255), allowNull: false },
  orden: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
}, {
  tableName: "imagenes_sitio",
  timestamps: false,
});

module.exports = ImagenSitio;
