const { DataTypes } = require("sequelize");
const sequelize = require("../config/database");

// Foto de un mensaje. Solo guarda el nombre del archivo: vive en una carpeta privada y se entrega por una ruta que revisa permisos.
const MensajeImagen = sequelize.define("MensajeImagen", {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  mensaje_id: { type: DataTypes.INTEGER, allowNull: false },
  archivo: { type: DataTypes.STRING(120), allowNull: false },
  tipo: { type: DataTypes.STRING(30), allowNull: false },
  orden: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
}, { tableName: "mensaje_imagenes", timestamps: false });

module.exports = MensajeImagen;
