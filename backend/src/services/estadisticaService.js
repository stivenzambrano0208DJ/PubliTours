const { fn, col, literal } = require("sequelize");
const { Reserva, ItinerarioItem, Itinerario, Usuario, SitioTuristico, Prestador } = require("../models");

// RN-10: el panel solo debe exponer información agregada, nunca datos personales individuales.
async function obtenerResumen() {
  const [
    reservasPorEstado,
    usuariosPorRol,
    prestadoresPorEstado,
    totalItinerarios,
    totalSitiosActivos,
    sitiosMasReservados,
    sitiosMasIncluidosEnItinerarios,
  ] = await Promise.all([
    Reserva.findAll({
      attributes: ["estado", [fn("COUNT", col("id")), "total"]],
      group: ["estado"],
      raw: true,
    }),
    Usuario.findAll({
      attributes: ["rol", [fn("COUNT", col("id")), "total"]],
      group: ["rol"],
      raw: true,
    }),
    Prestador.findAll({
      attributes: ["estado_verificacion", [fn("COUNT", col("id")), "total"]],
      group: ["estado_verificacion"],
      raw: true,
    }),
    Itinerario.count(),
    SitioTuristico.count({ where: { estado: "activo" } }),
    Reserva.findAll({
      attributes: ["sitio_id", [fn("COUNT", col("Reserva.id")), "total_reservas"]],
      include: [{ model: SitioTuristico, as: "sitio", attributes: ["nombre", "municipio", "categoria"] }],
      group: ["sitio_id", "sitio.id"],
      order: [[literal("total_reservas"), "DESC"]],
      limit: 5,
    }),
    ItinerarioItem.findAll({
      attributes: ["sitio_id", [fn("COUNT", col("ItinerarioItem.id")), "veces_incluido"]],
      include: [{ model: SitioTuristico, as: "sitio", attributes: ["nombre", "municipio", "categoria"] }],
      group: ["sitio_id", "sitio.id"],
      order: [[literal("veces_incluido"), "DESC"]],
      limit: 5,
    }),
  ]);

  return {
    reservas: {
      por_estado: reservasPorEstado,
      total: reservasPorEstado.reduce((acc, r) => acc + Number(r.total), 0),
    },
    usuarios_por_rol: usuariosPorRol,
    prestadores_por_estado: prestadoresPorEstado,
    itinerarios_generados: totalItinerarios,
    sitios_activos_en_catalogo: totalSitiosActivos,
    destinos_mas_reservados: sitiosMasReservados.map((r) => ({
      sitio: r.sitio ? r.sitio.nombre : "Sitio eliminado",
      municipio: r.sitio ? r.sitio.municipio : null,
      categoria: r.sitio ? r.sitio.categoria : null,
      total_reservas: Number(r.get("total_reservas")),
    })),
    destinos_con_mayor_interes: sitiosMasIncluidosEnItinerarios.map((i) => ({
      sitio: i.sitio ? i.sitio.nombre : "Sitio eliminado",
      municipio: i.sitio ? i.sitio.municipio : null,
      categoria: i.sitio ? i.sitio.categoria : null,
      veces_incluido_en_itinerarios: Number(i.get("veces_incluido")),
    })),
  };
}

module.exports = { obtenerResumen };
