const { DataTypes } = require("sequelize");
const crypto = require("crypto");
const sequelize = require("../config/database");

// Código corto del comprobante (sin letras ni números que se confundan: 0/O, 1/I).
const ALFABETO = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";
const generarCodigo = () => "PT-" + Array.from(crypto.randomBytes(6), (b) => ALFABETO[b % ALFABETO.length]).join("");

// RN-04: toda solicitud queda "pendiente" hasta que el prestador la confirme o rechace.
const Reserva = sequelize.define("Reserva", {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  turista_id: { type: DataTypes.INTEGER, allowNull: false },
  sitio_id: { type: DataTypes.INTEGER, allowNull: false },
  prestador_id: { type: DataTypes.INTEGER, allowNull: false },
  fecha_solicitud: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
  fecha_servicio: { type: DataTypes.DATEONLY, allowNull: false },
  paquete_id: { type: DataTypes.INTEGER, allowNull: true }, // reserva de un paquete (sitio_id = su primer servicio)
  personas: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 1 },
  ninos: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 }, // cuántas de las personas son niños
  codigo: { type: DataTypes.STRING(12), allowNull: true, unique: true }, // comprobante que el turista presenta al llegar
  recordatorio_enviado_en: { type: DataTypes.DATE, allowNull: true },
  total: { type: DataTypes.DECIMAL(12, 2), allowNull: false, defaultValue: 0 },
  politica_cancelacion: { type: DataTypes.STRING(12), allowNull: false, defaultValue: "flexible" }, // la del servicio al reservar (congelada)
  cancelacion_tardia: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false }, // el turista canceló una confirmada fuera del plazo
  cierre_automatico: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false }, // se completó sola porque el prestador no registró la asistencia
  aviso_cierre_en: { type: DataTypes.DATE, allowNull: true }, // cuándo se le recordó al prestador registrar la asistencia
  recordatorio_resena_en: { type: DataTypes.DATE, allowNull: true }, // cuándo se le recordó a la turista calificar (una sola vez)
  comision_pct: { type: DataTypes.DECIMAL(4, 1), allowNull: true }, // % de comisión estimada, congelado al confirmar
  comision: { type: DataTypes.DECIMAL(12, 2), allowNull: true }, // comisión estimada (no se cobra todavía)
  nota: { type: DataTypes.TEXT, allowNull: true },
  motivo_rechazo: { type: DataTypes.TEXT, allowNull: true },
  estado: { type: DataTypes.ENUM("pendiente", "confirmada", "rechazada", "cancelada", "completada", "no_asistio"), allowNull: false, defaultValue: "pendiente" },
}, {
  tableName: "reservas",
  timestamps: false,
  hooks: { beforeValidate: (r) => { if (!r.codigo) r.codigo = generarCodigo(); } },
});

module.exports = Reserva;
