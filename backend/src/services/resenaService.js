const { fn, col, UniqueConstraintError } = require("sequelize");
const { Reserva, SitioTuristico, Prestador, Resena, Usuario, Paquete } = require("../models");
const { notificar } = require("./notificacionService");
const { hoyLocal } = require("../utils/fechas");
const { ErrorHttp } = require("../utils/errores");
const politicas = require("../politicas");


// Reseña de una reserva propia: solo si quedó completada (el turista asistió o se cerró sola) y la fecha del servicio ya pasó.
async function crearResena({ reservaId, turista_id, calificacion, comentario }) {
  const reserva = await Reserva.findByPk(reservaId, { include: [{ model: SitioTuristico, as: "sitio" }, { model: Paquete, as: "paquete" }] });
  politicas.reservas.exigirTuristaDeLaReserva(turista_id, reserva);
  if (reserva.estado !== "completada") throw new ErrorHttp(400, "Solo puedes calificar reservas completadas: el prestador debe registrar tu asistencia o cerrarse sola pasados unos días.");
  if (reserva.fecha_servicio > hoyLocal()) throw new ErrorHttp(400, "Podrás calificar este sitio después de la fecha del servicio.");
  if (await Resena.findOne({ where: { reserva_id: reserva.id } })) throw new ErrorHttp(400, "Ya calificaste esta reserva.");

  let resena;
  try {
    resena = await Resena.create({
      sitio_id: reserva.paquete_id ? null : reserva.sitio_id, paquete_id: reserva.paquete_id || null,
      turista_id, reserva_id: reserva.id, calificacion, comentario: comentario || null,
    });
  } catch (error) {
    // Doble envío simultáneo: la restricción única de reserva_id lo detiene y se informa igual que el chequeo previo.
    if (error instanceof UniqueConstraintError) throw new ErrorHttp(400, "Ya calificaste esta reserva.");
    throw error;
  }

  const prestador = await Prestador.findByPk(reserva.prestador_id);
  if (prestador) {
    await notificar(prestador.usuario_id, "nueva_resena", `Recibiste una calificación de ${calificacion}/5 en ${reserva.paquete ? `el paquete "${reserva.paquete.nombre}"` : `"${reserva.sitio.nombre}"`}.`);
  }
  return resena;
}

// El prestador dueño del sitio responde (o edita su respuesta a) una reseña.
async function responderResena({ resenaId, usuarioPrestadorId, respuesta }) {
  const resena = await Resena.findByPk(resenaId, { include: [{ model: SitioTuristico }, { model: Paquete }] });
  if (!resena) throw new ErrorHttp(400, "Reseña no encontrada.");
  const objeto = resena.SitioTuristico || resena.Paquete;
  const prestador = await Prestador.findByPk(objeto.prestador_id);
  politicas.negocios.exigirResponderResena(usuarioPrestadorId, prestador); // RN-07
  const primeraVez = !resena.respuesta;
  await resena.update({ respuesta, fecha_respuesta: new Date() });
  if (primeraVez) {
    await notificar(resena.turista_id, "resena_respondida", `${prestador.nombre_negocio} respondió tu reseña de "${objeto.nombre}".`);
  }
  return resena;
}

// Tope de reseñas por respuesta (las más recientes); el total y el promedio se calculan sobre todas, en SQL.
const LIMITE_RESENAS = 50;

// Una reseña como la ve el público: lo que se muestra (texto, calificación, fecha, respuesta y el nombre de quien la escribió y del servicio),
// sin identificadores internos como la cuenta o la reserva de la persona. Es una lista blanca: un campo nuevo del modelo no sale solo.
const resenaPublica = (r) => ({
  id: r.id,
  calificacion: r.calificacion,
  comentario: r.comentario,
  fecha: r.fecha,
  respuesta: r.respuesta,
  fecha_respuesta: r.fecha_respuesta,
  turista: { nombre: r.turista?.nombre },
  ...(r.SitioTuristico ? { SitioTuristico: { nombre: r.SitioTuristico.nombre } } : {}),
  ...(r.Paquete ? { Paquete: { nombre: r.Paquete.nombre } } : {}),
});

async function listarResenasSitio(id, campo = "sitio_id") {
  const [resumen, resenas] = await Promise.all([
    Resena.findOne({ attributes: [[fn("AVG", col("calificacion")), "promedio"], [fn("COUNT", col("id")), "total"]], where: { [campo]: id }, raw: true }),
    Resena.findAll({
      where: { [campo]: id },
      include: [{ model: Usuario, as: "turista", attributes: ["id", "nombre"] }],
      order: [["fecha", "DESC"]],
      limit: LIMITE_RESENAS,
    }),
  ]);
  const total = Number(resumen.total);
  return { total, promedio: total ? Math.round(Number(resumen.promedio) * 10) / 10 : null, resenas: resenas.map(resenaPublica) };
}

// Agrega calificacion_promedio y total_resenas a una lista de sitios (objetos planos).
async function adjuntarResumen(sitios, campo = "sitio_id") {
  if (sitios.length === 0) return sitios;
  const filas = await Resena.findAll({
    attributes: [campo, [fn("AVG", col("calificacion")), "promedio"], [fn("COUNT", col("id")), "total"]],
    where: { [campo]: sitios.map((s) => s.id) },
    group: [campo],
    raw: true,
  });
  const porSitio = new Map(filas.map((f) => [f[campo], f]));
  return sitios.map((s) => {
    const f = porSitio.get(s.id);
    return { ...s, calificacion_promedio: f ? Math.round(Number(f.promedio) * 10) / 10 : null, total_resenas: f ? Number(f.total) : 0 };
  });
}

module.exports = { responderResena, crearResena, listarResenasSitio, adjuntarResumen, resenaPublica };
