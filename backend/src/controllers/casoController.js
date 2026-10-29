const casoService = require("../services/casoService");
const { ESTADOS_CASO } = require("../config/soporte");

const abrir = async (req, res) => res.status(201).json(await casoService.abrir({ usuario: req.usuario, ...req.body }));
const mios = async (req, res) => res.json(await casoService.listarMios(req.usuario));

// Administración: un estado que no existe se ignora y se muestran los abiertos.
const listar = async (req, res) => res.json(await casoService.listar({ estado: ESTADOS_CASO.includes(req.query.estado) ? req.query.estado : "abierto" }));
const atender = async (req, res) => res.json(await casoService.atender({ id: req.params.id, ...req.body, admin_id: req.usuario.id }));

module.exports = { abrir, mios, listar, atender };
