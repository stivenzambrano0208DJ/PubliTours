const { DataTypes } = require("sequelize");
const sequelize = require("../config/database");

// Una reseña por reserva cumplida (confirmada y con fecha de servicio ya pasada).
const Resena = sequelize.define("Resena", {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  sitio_id: { type: DataTypes.INTEGER, allowNull: true }, // reseña de un servicio...
  paquete_id: { type: DataTypes.INTEGER, allowNull: true }, // ...o de un paquete
  turista_id: { type: DataTypes.INTEGER, allowNull: false },
  reserva_id: { type: DataTypes.INTEGER, allowNull: false, unique: true },
  calificacion: { type: DataTypes.INTEGER, allowNull: false, validate: { min: 1, max: 5 } },
  comentario: { type: DataTypes.TEXT, allowNull: true },
  respuesta: { type: DataTypes.TEXT, allowNull: true },
  fecha_respuesta: { type: DataTypes.DATE, allowNull: true },
  fecha: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
}, { tableName: "resenas", timestamps: false });

module.exports = Resena;
