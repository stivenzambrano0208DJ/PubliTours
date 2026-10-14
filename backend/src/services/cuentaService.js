const bcrypt = require("bcryptjs");
const crypto = require("crypto");
const { Op } = require("sequelize");
const {
  sequelize, Usuario, SitioTuristico, Paquete, Reserva, Resena, Favorito, Itinerario, ItinerarioItem,
  Notificacion, CodigoVerificacion, PasswordReset,
} = require("../models");
const { ErrorHttp } = require("../utils/errores");
const politicas = require("../politicas");
const { hoyLocal } = require("../utils/fechas");
const { prestadorDeUsuario } = require("./negocioPropio");
const mensajeService = require("./mensajeService");


// Descarga de datos personales: todo lo que la plataforma guarda sobre la persona, sin contraseñas ni códigos.
async function exportarDatos(usuario_id) {
  const usuario = await Usuario.findByPk(usuario_id, {
    attributes: ["id", "nombre", "correo", "rol", "fecha_registro", "correo_verificado", "acepto_terminos_en", "version_terminos"],
  });
  const prestador = await prestadorDeUsuario(usuario_id);

  const [reservas, resenas, favoritos, itinerarios, notificaciones] = await Promise.all([
    Reserva.findAll({
      where: { turista_id: usuario_id },
      include: [{ model: SitioTuristico, as: "sitio", attributes: ["nombre"] }, { model: Paquete, as: "paquete", attributes: ["nombre"] }],
      order: [["id", "ASC"]],
    }),
    Resena.findAll({ where: { turista_id: usuario_id }, order: [["id", "ASC"]] }),
    Favorito.findAll({ where: { usuario_id }, include: [{ model: SitioTuristico, as: "sitio", attributes: ["nombre"] }] }),
    Itinerario.findAll({ where: { turista_id: usuario_id }, include: [{ model: ItinerarioItem, as: "items" }], order: [["id", "ASC"]] }),
    Notificacion.findAll({ where: { usuario_id }, order: [["id", "ASC"]] }),
  ]);

  const datos = {
    generado_en: new Date().toISOString(),
    cuenta: usuario,
    reservas, resenas, favoritos, itinerarios, notificaciones,
    mensajes: await mensajeService.exportarMensajes({ id: usuario_id }), // sus conversaciones (de las fotos, solo cuántas hay)
  };
  if (prestador) {
    datos.negocio = prestador;
    datos.servicios = await SitioTuristico.unscoped().findAll({ where: { prestador_id: prestador.id } }); // son sus datos: se exportan completos
    datos.paquetes = await Paquete.unscoped().findAll({ where: { prestador_id: prestador.id } });
  }
  return JSON.parse(JSON.stringify(datos)); // fechas y modelos a JSON plano
}

// Reservas que aún dependen de la persona: pendientes, o confirmadas con fecha de hoy en adelante.
const reservasVivas = (campo, id) => Reserva.count({
  where: { [campo]: id, [Op.or]: [{ estado: "pendiente" }, { estado: "confirmada", fecha_servicio: { [Op.gte]: hoyLocal() } }] },
});

// Eliminar la cuenta propia. Exige la contraseña y no deja reservas a medias. Los datos personales se borran o anonimizan;
// el historial de reservas de otras personas se conserva sin identificar a quien eliminó su cuenta.
async function eliminarCuenta({ usuario_id, password }) {
  const usuario = await Usuario.findByPk(usuario_id);
  if (!usuario) throw new ErrorHttp(404, "Usuario no encontrado.");
  politicas.cuentas.exigirEliminarCuenta(usuario);
  if (!(await bcrypt.compare(password, usuario.password_hash))) throw new ErrorHttp(400, "La contraseña no es correcta.");

  const prestador = await prestadorDeUsuario(usuario_id);
  const propias = await reservasVivas("turista_id", usuario_id);
  if (propias > 0) {
    throw new ErrorHttp(400, `Tienes ${propias} reserva(s) pendiente(s) o próxima(s). Cancélalas antes de eliminar tu cuenta.`);
  }
  if (prestador) {
    const recibidas = await reservasVivas("prestador_id", prestador.id);
    if (recibidas > 0) {
      throw new ErrorHttp(400, `Tu negocio tiene ${recibidas} reserva(s) pendiente(s) o próxima(s). Atiéndelas (confirma, rechaza o espera a que se cumplan) antes de eliminar tu cuenta.`);
    }
  }

  let fotosDeMensajes = [];
  await sequelize.transaction(async (transaction) => {
    // Sus conversaciones (como turista y como dueño de un negocio) se borran con todos sus mensajes y fotos.
    fotosDeMensajes = await mensajeService.eliminarConversacionesDe(usuario_id, transaction);
    const donde = { where: { usuario_id }, transaction };
    await Promise.all([Favorito.destroy(donde), Notificacion.destroy(donde), CodigoVerificacion.destroy(donde), PasswordReset.destroy(donde)]);
    await Itinerario.destroy({ where: { turista_id: usuario_id }, transaction }); // sus ítems caen en cascada
    await Reserva.update({ nota: null }, { where: { turista_id: usuario_id }, transaction }); // texto libre del turista

    if (prestador) {
      // Nada del negocio queda publicado ni con datos de contacto.
      await SitioTuristico.update({ estado: "archivado" }, { where: { prestador_id: prestador.id }, transaction });
      await Paquete.update({ estado: "archivado" }, { where: { prestador_id: prestador.id }, transaction });
      await prestador.update({ descripcion: null, telefono: null, direccion: null, redes: null }, { transaction });
    }

    await usuario.update({
      nombre: "Cuenta eliminada",
      correo: `eliminado-${usuario.id}@eliminado.invalid`,
      password_hash: await bcrypt.hash(crypto.randomBytes(32).toString("hex"), 10), // nadie puede iniciar sesión
      activo: false,
      correo_verificado: false,
      eliminado_en: new Date(),
    }, { transaction });
  });
  mensajeService.eliminarArchivosMensaje(fotosDeMensajes); // los archivos se borran del disco solo si la transacción se confirmó
}

module.exports = { exportarDatos, eliminarCuenta };
