const { DataTypes } = require("sequelize");
const sequelize = require("../config/database");

// Un negocio que la administración invitó por correo a publicar en PubliTours.
const Invitacion = sequelize.define("Invitacion", {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  correo: { type: DataTypes.STRING(150), allowNull: false },
  nombre_negocio: { type: DataTypes.STRING(150), allowNull: true },
  enviada_por: { type: DataTypes.INTEGER, allowNull: true },
  enviada_en: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
}, { tableName: "invitaciones", timestamps: false });

module.exports = Invitacion;
