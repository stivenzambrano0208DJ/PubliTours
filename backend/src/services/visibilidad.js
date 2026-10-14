const { literal } = require("sequelize");
const { Prestador, Usuario } = require("../models");

// Qué es "público": lo que cualquier visitante puede ver y reservar. Un servicio solo es público si su negocio está operativo:
// aprobado por el administrador Y con la cuenta activa (no suspendida ni eliminada). Si el administrador suspende o rechaza
// a un prestador, todo lo suyo deja de aparecer en el catálogo, los itinerarios y los favoritos, y no se puede reservar.
// Los servicios sin prestador (cargados por el administrador) siguen siendo públicos.

// Condición SQL para filtrar servicios dentro de otra consulta. `alias` es el nombre de la tabla de servicios en esa consulta.
const sitioVisibleSql = (alias = "SitioTuristico") => literal(`(
  "${alias}"."prestador_id" IS NULL OR EXISTS (
    SELECT 1 FROM prestadores pv JOIN usuarios uv ON uv.id = pv.usuario_id
    WHERE pv.id = "${alias}"."prestador_id" AND pv.estado_verificacion = 'aprobado' AND uv.activo = true AND uv.eliminado_en IS NULL
  )
)`);

// Un paquete es público si su negocio está operativo y todos sus servicios siguen activos (se evalúa en SQL, no en memoria).
const paqueteVisibleSql = (alias = "Paquete") => literal(`(
  EXISTS (
    SELECT 1 FROM prestadores pp JOIN usuarios up ON up.id = pp.usuario_id
    WHERE pp.id = "${alias}"."prestador_id" AND pp.estado_verificacion = 'aprobado' AND up.activo = true AND up.eliminado_en IS NULL
  )
  AND NOT EXISTS (
    SELECT 1 FROM paquete_items pi JOIN sitios_turisticos sp ON sp.id = pi.sitio_id
    WHERE pi.paquete_id = "${alias}"."id" AND sp.estado <> 'activo'
  )
)`);

// De una lista de ids de prestador, cuáles están operativos.
async function prestadoresOperativos(ids) {
  if (ids.length === 0) return new Set();
  const filas = await Prestador.findAll({
    where: { id: ids, estado_verificacion: "aprobado" },
    include: [{ model: Usuario, attributes: [], where: { activo: true, eliminado_en: null } }],
    attributes: ["id"],
    raw: true,
  });
  return new Set(filas.map((f) => f.id));
}

async function prestadorOperativo(id) {
  return (await prestadoresOperativos([id])).has(id);
}

module.exports = { sitioVisibleSql, paqueteVisibleSql, prestadorOperativo };
