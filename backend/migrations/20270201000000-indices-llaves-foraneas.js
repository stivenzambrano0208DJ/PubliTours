"use strict";

// Índices en las llaves foráneas que aún no tenían uno. PostgreSQL NO los crea solo: sin ellos, cada JOIN por esa columna y cada
// borrado en cascada (por ejemplo, al eliminar una cuenta o un negocio) recorre la tabla completa, y se vuelve lento al crecer los datos.
//
// Solo AÑADE índices: no cambia, mueve ni borra datos ni columnas. Es reversible (down los elimina) y repetible (IF NOT EXISTS / IF EXISTS).
// Cada fila es [tabla, columna]; el nombre del índice sale de ambos.
const INDICES = [
  ["auditoria", "actor_id"],
  ["favoritos", "sitio_id"],
  ["imagenes_sitio", "sitio_id"],
  ["itinerario_items", "itinerario_id"],
  ["itinerario_items", "sitio_id"],
  ["itinerarios", "turista_id"],
  ["mensajes", "paquete_id"],
  ["mensajes", "reserva_id"],
  ["mensajes", "sitio_id"],
  ["paquete_items", "sitio_id"],
  ["paquetes", "prestador_id"],
  ["password_resets", "usuario_id"],
  ["reportes_mensaje", "reportado_por"],
  ["reportes_mensaje", "revisado_por"],
  ["resenas", "turista_id"],
  ["reservas", "paquete_id"],
  ["sitios_turisticos", "prestador_id"],
];

const nombre = (tabla, columna) => `idx_${tabla}_${columna}`;

module.exports = {
  async up(queryInterface) {
    for (const [tabla, columna] of INDICES) {
      await queryInterface.sequelize.query(`CREATE INDEX IF NOT EXISTS ${nombre(tabla, columna)} ON ${tabla} (${columna})`);
    }
  },

  async down(queryInterface) {
    for (const [tabla, columna] of INDICES) {
      await queryInterface.sequelize.query(`DROP INDEX IF EXISTS ${nombre(tabla, columna)}`);
    }
  },
};
