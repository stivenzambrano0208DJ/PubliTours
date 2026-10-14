const { esAdministrador, exigir } = require("./comun");

// Itinerarios (RN-07). Ver: la turista dueña o la administración. Compartir y revocar el enlace público: solo la dueña.
const puedeVerItinerario = (usuario, itinerario) => itinerario.turista_id === usuario.id || esAdministrador(usuario);
const exigirVerItinerario = (usuario, itinerario) =>
  exigir(puedeVerItinerario(usuario, itinerario), 403, "No puede consultar el itinerario de otro usuario.");

const puedeCompartirItinerario = (usuario_id, itinerario) => itinerario.turista_id === usuario_id;
const exigirCompartirItinerario = (usuario_id, itinerario) =>
  exigir(puedeCompartirItinerario(usuario_id, itinerario), 403, "No puede compartir el itinerario de otro usuario.");

module.exports = { puedeVerItinerario, exigirVerItinerario, puedeCompartirItinerario, exigirCompartirItinerario };
