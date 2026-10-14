const prestadores = require("../services/prestadorService");
const estadisticas = require("../services/estadisticaPrestadorService");

// Capa HTTP de los negocios: las reglas (estados, permisos, métricas) viven en prestadorService.

// RF-02: perfil de negocio propio del prestador autenticado.
const obtenerPerfilPropio = async (req, res) => res.json(await prestadores.perfilDe(req.usuario.id));

const misSitios = async (req, res) => res.json(await prestadores.misSitios(req.usuario.id));

const resumenServicios = async (req, res) => res.json(await prestadores.resumenServicios(req.usuario.id));

const resenasRecibidas = async (req, res) => res.json(await prestadores.resenasRecibidas(req.usuario.id));

const estadisticasPropias = async (req, res) => res.json(await estadisticas.estadisticas(req.usuario.id, req.query));

const descargarEstadisticasCsv = async (req, res) => {
  const { nombre, contenido } = await estadisticas.exportarCsv(req.usuario.id, req.query);
  res.setHeader("Content-Type", "text/csv; charset=utf-8");
  res.setHeader("Content-Disposition", `attachment; filename="${nombre}"`);
  return res.send(contenido);
};

const perfilPublico = async (req, res) => res.json(await prestadores.perfilPublico(req.params.id));

const crearPerfil = async (req, res) => res.status(201).json(await prestadores.crearPerfil(req.usuario, req.body));

const actualizarPerfil = async (req, res) => res.json(await prestadores.actualizarPerfil(req.params.id, req.usuario, req.body));

const enviarARevision = async (req, res) => res.json(await prestadores.enviarARevision(req.params.id, req.usuario));

// RF-03: solo administrador.
const listarPendientes = async (req, res) => res.json(await prestadores.listarPendientes());

const listarTodos = async (req, res) => res.json(await prestadores.listarTodos(req.query.estado));

const verificar = async (req, res) => res.json(await prestadores.verificar(req.params.id, req.body, req.usuario.id));

module.exports = { estadisticasPropias, descargarEstadisticasCsv, perfilPublico, enviarARevision, listarTodos, resumenServicios, resenasRecibidas, obtenerPerfilPropio, misSitios, crearPerfil, actualizarPerfil, listarPendientes, verificar };
