// Un "mundo" completo para las pruebas de seguridad: dos negocios (A y B) con servicios y paquetes, dos turistas (A y B), un
// administrador, y datos de A que B no debe poder ver ni tocar (reservas, reseña, itinerario compartido, notificaciones, favoritos).
const fs = require("node:fs");
const path = require("node:path");
const { request, app, registrar, auth } = require("./helpers");
const { Prestador, SitioTuristico, Reserva, Resena, Itinerario, ItinerarioItem, Notificacion, Usuario, Conversacion, Mensaje, MensajeImagen } = require("../src/models");
const { DIR_PRIVADO_MENSAJES } = require("../src/utils/archivos");

const api = (m, url) => request(app)[m](`/api/v1${url}`);
const enDias = (n) => new Date(Date.now() + n * 864e5).toLocaleDateString("en-CA");

// Fotos privadas que crea el mundo; cada archivo de pruebas llama a limpiarMundo() al terminar para no dejarlas en el disco.
const fotosCreadas = [];
const limpiarMundo = () => { for (const f of fotosCreadas.splice(0)) fs.rmSync(f, { force: true }); };
const PNG_1X1 = Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR4nGP4z8DwHwAFAAH/q842iQAAAABJRU5ErkJggg==", "base64");

async function crearNegocio(etiqueta) {
  const cuenta = await registrar("prestador");
  const negocio = await Prestador.create({
    usuario_id: cuenta.usuario.id, nombre_negocio: `Negocio ${etiqueta}`, categoria: "Naturaleza", municipio: `Municipio ${etiqueta}`, estado_verificacion: "aprobado",
  });
  const sitios = [];
  for (const n of [1, 2]) {
    sitios.push(await SitioTuristico.create({
      nombre: `Servicio ${etiqueta} ${n}`, categoria: "Naturaleza", municipio: negocio.municipio, precio: n * 20000, prestador_id: negocio.id, tipo_viaje: "naturaleza",
    }));
  }
  const paquete = (await api("post", "/paquetes").set(auth(cuenta.token)).send({
    nombre: `Paquete ${etiqueta}`, descripcion: "Dos servicios juntos", precio: 50000, sitios: sitios.map((s, i) => ({ sitio_id: s.id, dia: i + 1 })),
  })).body;
  return { cuenta, negocio, sitios, paquete };
}

async function crearMundo() {
  const adminCuenta = await registrar("turista");
  await Usuario.update({ rol: "administrador" }, { where: { id: adminCuenta.usuario.id } }); // el rol se lee de la base, no del token
  const A = await crearNegocio("A");
  const B = await crearNegocio("B");
  const turistaA = await registrar("turista");
  const turistaB = await registrar("turista");

  const base = { turista_id: turistaA.usuario.id, sitio_id: A.sitios[0].id, prestador_id: A.negocio.id, personas: 2, total: 40000 };
  const reservaConfirmada = await Reserva.create({ ...base, fecha_servicio: enDias(20), estado: "confirmada", comision_pct: 10, comision: 4000 });
  const reservaPendiente = await Reserva.create({ ...base, fecha_servicio: enDias(21), estado: "pendiente" });
  const reservaCompletada = await Reserva.create({ ...base, fecha_servicio: enDias(-5), estado: "completada" });
  const resena = await Resena.create({ sitio_id: A.sitios[0].id, turista_id: turistaA.usuario.id, reserva_id: reservaCompletada.id, calificacion: 5, comentario: "Muy bueno" });

  const itinerario = await Itinerario.create({ turista_id: turistaA.usuario.id, presupuesto: 300000, dias: 1, personas: 2, fecha_inicio: enDias(30) });
  await ItinerarioItem.create({ itinerario_id: itinerario.id, sitio_id: A.sitios[0].id, dia: 1, orden: 1, score: 60, justificacion: "Se incluyó porque es una actividad gratuita." });
  const token = (await api("post", `/itinerarios/${itinerario.id}/compartir`).set(auth(turistaA.token))).body.token;

  const notificacion = await Notificacion.create({ usuario_id: turistaA.usuario.id, tipo: "prueba", mensaje: "Mensaje privado de A" });
  await api("post", `/favoritos/${A.sitios[0].id}`).set(auth(turistaA.token));

  // Una conversación privada entre la turista A y el negocio A, con una foto de verdad en la carpeta privada
  fs.mkdirSync(DIR_PRIVADO_MENSAJES, { recursive: true });
  const conversacion = await Conversacion.create({ turista_id: turistaA.usuario.id, prestador_id: A.negocio.id });
  const mensajeConversacion = await Mensaje.create({ conversacion_id: conversacion.id, autor_id: turistaA.usuario.id, texto: "Mensaje privado de la conversación de A", sitio_id: A.sitios[0].id });
  const archivo = `msg-${Date.now()}-${Math.floor(Math.random() * 1e9)}.png`;
  fs.writeFileSync(path.join(DIR_PRIVADO_MENSAJES, archivo), PNG_1X1);
  fotosCreadas.push(path.join(DIR_PRIVADO_MENSAJES, archivo));
  const imagen = await MensajeImagen.create({ mensaje_id: mensajeConversacion.id, archivo, tipo: "image/png", orden: 0 });

  return {
    admin: adminCuenta, A, B, turistaA, turistaB, conversacion, mensajeConversacion, imagen,
    reservaConfirmada, reservaPendiente, reservaCompletada, resena, itinerario, tokenCompartido: token, notificacion,
  };
}

module.exports = { crearMundo, limpiarMundo, enDias, api };
