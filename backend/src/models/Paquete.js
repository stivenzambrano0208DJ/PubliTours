const { DataTypes } = require("sequelize");
const sequelize = require("../config/database");

// Paquete: varios servicios de un mismo prestador vendidos juntos, con precio propio por persona.
const Paquete = sequelize.define("Paquete", {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  prestador_id: { type: DataTypes.INTEGER, allowNull: false },
  nombre: { type: DataTypes.STRING(150), allowNull: false },
  descripcion: { type: DataTypes.TEXT, allowNull: true },
  precio: { type: DataTypes.DECIMAL(10, 2), allowNull: false, defaultValue: 0 },
  politica_cancelacion: { type: DataTypes.STRING(12), allowNull: false, defaultValue: "flexible" },
  capacidad: { type: DataTypes.INTEGER, allowNull: true },
  imagen_url: { type: DataTypes.STRING(255), allowNull: true },
  motivo_moderacion: { type: DataTypes.TEXT, allowNull: true },
  estado: { type: DataTypes.ENUM("activo", "inactivo", "archivado", "oculto"), allowNull: false, defaultValue: "activo" },
  fecha_creacion: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
}, {
  tableName: "paquetes",
  timestamps: false,
  // Seguro por defecto: el motivo con que el administrador oculta algo es interno y NO se carga en ninguna consulta, incluidas las que
  // llegan por relaciones (reservas, itinerarios, paquetes…). Solo lo piden, con .unscoped(), las vistas de su dueño y de la administración.
  defaultScope: { attributes: { exclude: ["motivo_moderacion"] } },
});

module.exports = Paquete;
