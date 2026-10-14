const { DataTypes } = require("sequelize");
const sequelize = require("../config/database");

const Usuario = sequelize.define("Usuario", {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  nombre: { type: DataTypes.STRING(120), allowNull: false },
  correo: { type: DataTypes.STRING(150), allowNull: false, unique: true, validate: { isEmail: true } },
  password_hash: { type: DataTypes.STRING(255), allowNull: false },
  rol: { type: DataTypes.ENUM("turista", "prestador", "administrador"), allowNull: false, defaultValue: "turista" },
  correo_verificado: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
  acepto_terminos_en: { type: DataTypes.DATE, allowNull: true },
  version_terminos: { type: DataTypes.STRING(20), allowNull: true },
  activo: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true }, // false = cuenta suspendida por un administrador
  token_version: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 }, // sube al cambiar la contraseña: invalida las sesiones anteriores
  eliminado_en: { type: DataTypes.DATE, allowNull: true }, // cuenta eliminada por su dueño (anonimizada)
  fecha_registro: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
}, {
  tableName: "usuarios",
  timestamps: false,
});

module.exports = Usuario;
