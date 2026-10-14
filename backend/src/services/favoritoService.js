const { Op } = require("sequelize");
const { Favorito, SitioTuristico } = require("../models");
const { adjuntarResumen } = require("./resenaService");
const { sitioVisibleSql, prestadorOperativo } = require("./visibilidad");
const { ErrorHttp } = require("../utils/errores");

// Solo se listan favoritos que hoy son públicos (activos y de un negocio operativo): lo ocultado o suspendido no se muestra.
async function listar(usuario_id) {
  const favoritos = await Favorito.findAll({
    where: { usuario_id },
    include: [{ model: SitioTuristico, as: "sitio", required: true, where: { estado: "activo", [Op.and]: [sitioVisibleSql("sitio")] } }],
    order: [["fecha", "DESC"]],
  });
  return adjuntarResumen(favoritos.map((f) => f.sitio.toJSON()));
}

// Solo se puede marcar como favorito un servicio público; agregarlo dos veces no duplica.
async function agregar({ usuario_id, sitio_id }) {
  const sitio = await SitioTuristico.findByPk(sitio_id);
  const publico = sitio && sitio.estado === "activo" && (!sitio.prestador_id || (await prestadorOperativo(sitio.prestador_id)));
  if (!publico) throw new ErrorHttp(404, "Sitio no encontrado.");
  await Favorito.findOrCreate({ where: { usuario_id, sitio_id: sitio.id } });
  return { sitio_id: sitio.id, favorito: true };
}

async function quitar({ usuario_id, sitio_id }) {
  await Favorito.destroy({ where: { usuario_id, sitio_id } });
  return { sitio_id: Number(sitio_id), favorito: false };
}

module.exports = { listar, agregar, quitar };
