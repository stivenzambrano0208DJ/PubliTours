const { DataTypes } = require("sequelize");
const sequelize = require("../config/database");

// RN-01: un prestador no puede publicar hasta ser verificado por un administrador.
const Prestador = sequelize.define("Prestador", {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  usuario_id: { type: DataTypes.INTEGER, allowNull: false, unique: true },
  nombre_negocio: { type: DataTypes.STRING(150), allowNull: false },
  categoria: { type: DataTypes.STRING(60), allowNull: false },
  municipio: { type: DataTypes.STRING(80), allowNull: false },
  descripcion: { type: DataTypes.TEXT, allowNull: true },
  direccion: { type: DataTypes.STRING(200), allowNull: true }, // cómo llegar / dónde está el negocio
  redes: { type: DataTypes.STRING(200), allowNull: true }, // Instagram, Facebook o sitio web
  telefono: { type: DataTypes.STRING(20), allowNull: true },
  motivo_rechazo: { type: DataTypes.TEXT, allowNull: true },
  estado_verificacion: { type: DataTypes.ENUM("incompleto", "pendiente", "aprobado", "rechazado"), allowNull: false, defaultValue: "pendiente" },
}, {
  tableName: "prestadores",
  timestamps: false,
});

module.exports = Prestador;
