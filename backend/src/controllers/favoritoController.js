const favoritoService = require("../services/favoritoService");

const listar = async (req, res) => res.json(await favoritoService.listar(req.usuario.id));

const agregar = async (req, res) => res.status(201).json(await favoritoService.agregar({ usuario_id: req.usuario.id, sitio_id: req.params.sitioId }));

const quitar = async (req, res) => res.json(await favoritoService.quitar({ usuario_id: req.usuario.id, sitio_id: req.params.sitioId }));

module.exports = { listar, agregar, quitar };
