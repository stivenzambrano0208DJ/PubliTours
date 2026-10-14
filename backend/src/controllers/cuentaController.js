const cuentas = require("../services/cuentaService");

// Descarga de datos personales como archivo JSON.
const descargarDatos = async (req, res) => {
  const datos = await cuentas.exportarDatos(req.usuario.id);
  res.setHeader("Content-Disposition", 'attachment; filename="mis-datos-publitours.json"');
  return res.json(datos);
};

const eliminar = async (req, res) => {
  await cuentas.eliminarCuenta({ usuario_id: req.usuario.id, password: req.body.password });
  return res.json({ mensaje: "Tu cuenta fue eliminada." });
};

module.exports = { descargarDatos, eliminar };
