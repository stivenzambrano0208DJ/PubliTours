const { enviarCorreo } = require("./emailService");
const { Notificacion, Usuario } = require("../models");
const { ErrorHttp } = require("../utils/errores");
const politicas = require("../politicas");

// Único punto por el que se crean y leen las notificaciones de la plataforma. Nadie más debería usar el modelo Notificacion.

const LIMITE_NOTIFICACIONES = 100; // las más recientes; evita respuestas enormes en cuentas antiguas

// Algunos tipos, además de la campana, se envían por correo (sin esperar ni romper la operación si falla).
const CORREO_POR_TIPO = {
  nueva_reserva: { asunto: "Nueva solicitud de reserva en PubliTours", titulo: "Tienes una nueva solicitud", ruta: "/mi-negocio", texto: "Ver la solicitud" },
  reserva_solicitada: { asunto: "Recibimos tu solicitud de reserva", titulo: "Solicitud enviada", ruta: "/mis-reservas", texto: "Ver mis reservas" },
  reserva_confirmada: { asunto: "Tu reserva fue confirmada", titulo: "¡Reserva confirmada!", ruta: "/mis-reservas", texto: "Ver mi reserva" },
  reserva_rechazada: { asunto: "Tu reserva no pudo confirmarse", titulo: "Reserva rechazada", ruta: "/mis-reservas", texto: "Ver mis reservas" },
  reserva_cancelada: { asunto: "Una reserva fue cancelada", titulo: "Reserva cancelada", ruta: "/mi-negocio", texto: "Ver mis reservas recibidas" },
  reserva_modificada: { asunto: "Una reserva fue modificada", titulo: "Reserva modificada", ruta: "/mi-negocio", texto: "Revisar la reserva" },
  reserva_recordatorio: { asunto: "Recordatorio: tu viaje es mañana", titulo: "¡Mañana es tu experiencia!", ruta: "/mis-reservas", texto: "Ver mi comprobante" },
  reserva_no_asistio: { asunto: "Se registró que no asististe a tu reserva", titulo: "Reserva marcada como no asistida", ruta: "/mis-reservas", texto: "Ver mis reservas" },
  mensaje_nuevo: { asunto: "Tienes un mensaje nuevo en PubliTours", titulo: "Mensaje nuevo", ruta: "/mensajes", texto: "Abrir mis mensajes" },
  reserva_completada: { asunto: "¿Cómo te fue? Califica tu experiencia", titulo: "Cuéntanos tu experiencia", ruta: "/mis-reservas", texto: "Calificar ahora" },
};

// Crea la notificación dentro de la plataforma y, si el tipo tiene plantilla, envía además el correo.
async function notificar(usuario_id, tipo, mensaje) {
  const notificacion = await Notificacion.create({ usuario_id, tipo, mensaje });
  const plantilla = CORREO_POR_TIPO[tipo];
  if (plantilla) {
    Usuario.findByPk(usuario_id, { attributes: ["correo", "nombre"] })
      .then((u) => u && enviarCorreo({
        destinatario: u.correo,
        asunto: plantilla.asunto,
        titulo: plantilla.titulo,
        lineas: [`Hola ${u.nombre},`, mensaje],
        enlace: { ruta: plantilla.ruta, texto: plantilla.texto },
      }))
      .catch(() => {});
  }
  return notificacion;
}

// Una misma notificación para varias personas, en una sola inserción (anuncios del administrador, avisos a los administradores).
const notificarVarios = (usuarioIds, tipo, mensaje) =>
  Notificacion.bulkCreate(usuarioIds.map((usuario_id) => ({ usuario_id, tipo, mensaje })));

// RF-12: las notificaciones de una persona (nueva reserva, confirmación, rechazo, verificación…), las más recientes primero.
const listarDeUsuario = (usuario_id) =>
  Notificacion.findAll({ where: { usuario_id }, order: [["fecha", "DESC"]], limit: LIMITE_NOTIFICACIONES });

async function marcarLeida({ id, usuario_id }) {
  const notificacion = await Notificacion.findByPk(id);
  if (!notificacion) throw new ErrorHttp(404, "Notificación no encontrada.");
  politicas.notificaciones.exigirModificarNotificacion(usuario_id, notificacion);
  return notificacion.update({ leido: true });
}

module.exports = { notificar, notificarVarios, listarDeUsuario, marcarLeida };
