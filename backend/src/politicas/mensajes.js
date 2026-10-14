const { esAdministrador, esPrestador, exigir } = require("./comun");

// Mensajería. Una conversación une a una turista con un negocio; `negocio` es el perfil (Prestador) de esa conversación.
//
// Regla de producto: el negocio SOLO RESPONDE. Una conversación la abre siempre una persona que pregunta (turista, o un prestador que
// pregunta a otro negocio como lo haría un turista); no existe ninguna ruta para que un negocio le escriba primero a alguien.
// La administración no lee conversaciones: solo ve el mensaje concreto que alguien reportó.

// ¿Es parte de la conversación? La turista o el dueño del negocio. Para quien no lo es, la conversación "no existe" (404).
const esParticipante = (usuario, conversacion, negocio) =>
  conversacion.turista_id === usuario.id || (Boolean(negocio) && negocio.usuario_id === usuario.id);
const exigirParticipante = (usuario, conversacion, negocio) =>
  exigir(esParticipante(usuario, conversacion, negocio), 404, "Conversación no encontrada.");

// ¿Puede esta persona abrir una conversación con ese negocio? Cualquier turista o prestador, salvo con su propio negocio.
const puedeEscribirANegocio = (usuario, negocio) =>
  (usuario.rol === "turista" || esPrestador(usuario)) && Boolean(negocio) && negocio.usuario_id !== usuario.id;
const exigirEscribirANegocio = (usuario, negocio) =>
  exigir(puedeEscribirANegocio(usuario, negocio), 400, "No puedes escribirle a tu propio negocio.");

// ¿Puede escribir en una conversación ya abierta? La turista siempre; el negocio solo si la turista ya escribió (solo responde).
const puedeEscribirEnConversacion = (usuario, conversacion, negocio, { turistaYaEscribio }) =>
  esParticipante(usuario, conversacion, negocio) && (conversacion.turista_id === usuario.id || Boolean(turistaYaEscribio));
const exigirEscribirEnConversacion = (usuario, conversacion, negocio, estado) =>
  exigir(puedeEscribirEnConversacion(usuario, conversacion, negocio, estado), 400, "Solo puedes responder a quien te escribió primero.");

// ¿Puede ver una foto? Quienes participan (si el mensaje no fue retirado) y la administración, únicamente de mensajes reportados.
const puedeVerImagenMensaje = (usuario, { participante, retirado, reportado }) =>
  (participante && !retirado) || (esAdministrador(usuario) && reportado);

// ¿Puede reportar un mensaje? Quien participa en la conversación y no es su autor.
const puedeReportarMensaje = (usuario, mensaje, participante) => participante && mensaje.autor_id !== usuario.id && !mensaje.retirado;
const exigirReportarMensaje = (usuario, mensaje, participante) =>
  exigir(puedeReportarMensaje(usuario, mensaje, participante), 400, "No puedes reportar este mensaje.");

module.exports = {
  esParticipante, exigirParticipante, puedeEscribirANegocio, exigirEscribirANegocio,
  puedeEscribirEnConversacion, exigirEscribirEnConversacion, puedeVerImagenMensaje, puedeReportarMensaje, exigirReportarMensaje,
};
