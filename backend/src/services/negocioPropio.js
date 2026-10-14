const { Prestador } = require("../models");

// El negocio (perfil de prestador) de una cuenta, o null si aún no lo creó. Un solo lugar para esta consulta, que casi todos los
// servicios del prestador necesitan.
const prestadorDeUsuario = (usuario_id, opciones = {}) => Prestador.findOne({ where: { usuario_id }, ...opciones });

module.exports = { prestadorDeUsuario };
