const { QueryTypes } = require("sequelize");
const { sequelize, Usuario, Prestador } = require("../models");
const { notificarVarios } = require("./notificacionService");
const { validarPeriodo, mesesDelPeriodo } = require("../utils/periodo");
const { aCsv } = require("../utils/csv");
const auditoria = require("./auditoriaService");

// RN-10: solo agregados por mes, nunca datos de personas.
// Registros de usuarios por rol y solicitudes de reserva (con su valor) por mes, dentro del periodo.
async function tendencias(query) {
  const periodo = validarPeriodo(query);
  const consulta = (sql) => sequelize.query(sql, { replacements: periodo, type: QueryTypes.SELECT });

  const [usuarios, reservas] = await Promise.all([
    consulta(`SELECT to_char(fecha_registro, 'YYYY-MM') AS mes, rol, COUNT(*)::int AS total
              FROM usuarios WHERE eliminado_en IS NULL AND rol <> 'administrador' AND fecha_registro::date BETWEEN :desde AND :hasta GROUP BY 1, 2`),
    consulta(`SELECT to_char(fecha_solicitud, 'YYYY-MM') AS mes,
                     COUNT(*)::int AS solicitudes,
                     COUNT(*) FILTER (WHERE estado IN ('confirmada', 'completada'))::int AS aceptadas,
                     COALESCE(SUM(total) FILTER (WHERE estado IN ('confirmada', 'completada')), 0)::float AS valor_aceptado,
                     COALESCE(SUM(comision) FILTER (WHERE estado IN ('confirmada', 'completada')), 0)::float AS comision_estimada
              FROM reservas WHERE fecha_solicitud::date BETWEEN :desde AND :hasta GROUP BY 1`),
  ]);

  const por_mes = mesesDelPeriodo(periodo).map((mes) => {
    const r = reservas.find((x) => x.mes === mes);
    const deRol = (rol) => usuarios.find((x) => x.mes === mes && x.rol === rol)?.total || 0;
    return {
      mes,
      turistas_nuevos: deRol("turista"),
      prestadores_nuevos: deRol("prestador"),
      solicitudes: r?.solicitudes || 0,
      aceptadas: r?.aceptadas || 0,
      valor_aceptado: r?.valor_aceptado || 0,
      comision_estimada: r?.comision_estimada || 0,
    };
  });
  const suma = (campo) => por_mes.reduce((s, m) => s + m[campo], 0);
  return {
    periodo,
    totales: {
      turistas_nuevos: suma("turistas_nuevos"), prestadores_nuevos: suma("prestadores_nuevos"),
      solicitudes: suma("solicitudes"), aceptadas: suma("aceptadas"), valor_aceptado: suma("valor_aceptado"), comision_estimada: suma("comision_estimada"),
    },
    por_mes,
  };
}

async function tendenciasCsv(query) {
  const { periodo, por_mes } = await tendencias(query);
  return {
    nombre: `tendencias-${periodo.desde}-a-${periodo.hasta}.csv`,
    contenido: aCsv([
      ["mes", "turistas_nuevos", "prestadores_nuevos", "solicitudes", "aceptadas", "valor_aceptado_cop", "comision_estimada_cop"],
      ...por_mes.map((m) => [m.mes, m.turistas_nuevos, m.prestadores_nuevos, m.solicitudes, m.aceptadas, m.valor_aceptado, m.comision_estimada]),
    ]),
  };
}

// Anuncio del administrador a los prestadores (notificación dentro de la plataforma). Queda en la auditoría.
async function enviarAnuncio({ actor_id, mensaje, destinatarios }) {
  const where = destinatarios === "aprobados" ? { estado_verificacion: "aprobado" } : {};
  const prestadores = await Prestador.findAll({
    where,
    include: [{ model: Usuario, attributes: ["id"], where: { activo: true, eliminado_en: null } }],
    attributes: ["id", "usuario_id"],
  });
  await notificarVarios(prestadores.map((p) => p.usuario_id), "anuncio_admin", mensaje);
  await auditoria.registrar({
    actor_id, accion: "anuncio_enviado", entidad: "anuncio",
    detalle: `A ${destinatarios === "aprobados" ? "negocios aprobados" : "todos los negocios"} (${prestadores.length}): ${mensaje}`,
  });
  return { enviados: prestadores.length };
}

module.exports = { tendencias, tendenciasCsv, enviarAnuncio };
