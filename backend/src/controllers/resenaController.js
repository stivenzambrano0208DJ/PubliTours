const resenaService = require("../services/resenaService");

const crear = async (req, res) =>
  res.status(201).json(await resenaService.crearResena({
    reservaId: req.params.id, turista_id: req.usuario.id, calificacion: req.body.calificacion, comentario: req.body.comentario,
  }));

const listarPorSitio = async (req, res) => res.json(await resenaService.listarResenasSitio(req.params.id));

const listarPorPaquete = async (req, res) => res.json(await resenaService.listarResenasSitio(req.params.id, "paquete_id"));

const responder = async (req, res) =>
  res.json(await resenaService.responderResena({ resenaId: req.params.id, usuarioPrestadorId: req.usuario.id, respuesta: req.body.respuesta }));

module.exports = { crear, listarPorSitio, listarPorPaquete, responder };
