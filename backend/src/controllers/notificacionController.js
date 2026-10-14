const notificacionService = require("../services/notificacionService");

const misNotificaciones = async (req, res) => res.json(await notificacionService.listarDeUsuario(req.usuario.id));

const marcarLeida = async (req, res) => res.json(await notificacionService.marcarLeida({ id: req.params.id, usuario_id: req.usuario.id }));

module.exports = { misNotificaciones, marcarLeida };
