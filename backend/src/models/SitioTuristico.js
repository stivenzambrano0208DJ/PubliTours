const { DataTypes } = require("sequelize");
const sequelize = require("../config/database");

const SitioTuristico = sequelize.define("SitioTuristico", {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  prestador_id: { type: DataTypes.INTEGER, allowNull: true },
  nombre: { type: DataTypes.STRING(150), allowNull: false },
  categoria: { type: DataTypes.STRING(60), allowNull: false },
  municipio: { type: DataTypes.STRING(80), allowNull: false },
  precio: { type: DataTypes.DECIMAL(10, 2), allowNull: false, defaultValue: 0 },
  horario: { type: DataTypes.STRING(100), allowNull: true },
  descripcion: { type: DataTypes.TEXT, allowNull: true },
  // Etiquetas separadas por coma, ej: "pareja,naturaleza,aventura" — usadas en filtros (RF-06) y en el scoring (Sprint 3).
  tipo_viaje: { type: DataTypes.STRING(150), allowNull: true },
  imagen_url: { type: DataTypes.STRING(255), allowNull: true },
  latitud: { type: DataTypes.DECIMAL(10, 7), allowNull: true },
  longitud: { type: DataTypes.DECIMAL(10, 7), allowNull: true },
  // Máximo de personas por día. NULL = una sola reserva confirmada por fecha.
  politica_cancelacion: { type: DataTypes.STRING(12), allowNull: false, defaultValue: "flexible" }, // flexible | moderada | estricta
  capacidad: { type: DataTypes.INTEGER, allowNull: true },
  precio_nino: { type: DataTypes.DECIMAL(10, 2), allowNull: true }, // tarifa de niños; vacío = pagan lo mismo que un adulto
  grupo_min_personas: { type: DataTypes.INTEGER, allowNull: true }, // descuento por grupo: desde N personas...
  grupo_descuento_pct: { type: DataTypes.INTEGER, allowNull: true }, // ...X % sobre el subtotal
  motivo_moderacion: { type: DataTypes.TEXT, allowNull: true }, // por qué el administrador lo ocultó
  estado: { type: DataTypes.ENUM("activo", "inactivo", "archivado", "oculto"), allowNull: false, defaultValue: "activo" },
}, {
  tableName: "sitios_turisticos",
  timestamps: false,
  // Seguro por defecto: el motivo con que el administrador oculta algo es interno y NO se carga en ninguna consulta, incluidas las que
  // llegan por relaciones (reservas, itinerarios, paquetes…). Solo lo piden, con .unscoped(), las vistas de su dueño y de la administración.
  defaultScope: { attributes: { exclude: ["motivo_moderacion"] } },
});

module.exports = SitioTuristico;
