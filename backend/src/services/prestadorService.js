const { Op, fn, col } = require("sequelize");
const { adjuntarResumen, resenaPublica } = require("./resenaService");
const paqueteService = require("./paqueteService");
const { Prestador, Usuario, SitioTuristico, Reserva, Resena, Paquete, TarifaTemporada, ImagenSitio } = require("../models");
const { ErrorHttp } = require("../utils/errores");
const auditoria = require("./auditoriaService");
const { notificar, notificarVarios } = require("./notificacionService");
const politicas = require("../politicas");
const { prestadorDeUsuario } = require("./negocioPropio");

// Ciclo de vida del negocio (RN-01): incompleto → pendiente → aprobado | rechazado → (corrige) → pendiente.
// Solo un negocio aprobado puede publicar servicios y paquetes.

// Qué le falta al perfil para poder enviarse a revisión.
function camposFaltantes(p) {
  const faltan = [];
  if ((p.descripcion || "").trim().length < 30) faltan.push("una descripción de al menos 30 caracteres");
  if (!/^\d{7,15}$/.test(p.telefono || "")) faltan.push("un WhatsApp de contacto");
  if ((p.direccion || "").trim().length < 5) faltan.push("la dirección o cómo llegar");
  return faltan;
}

async function perfilDe(usuario_id) {
  const prestador = await prestadorDeUsuario(usuario_id);
  if (!prestador) throw new ErrorHttp(404, "Aún no has creado tu perfil de negocio.");
  return prestador;
}

// RN-07: el prestador solo toca su propio perfil.
async function perfilPropio(id, usuario, mensajeAjeno) {
  const prestador = await Prestador.findByPk(id);
  if (!prestador) throw new ErrorHttp(404, "Prestador no encontrado.");
  politicas.negocios.exigirEditarPerfil(usuario, prestador, mensajeAjeno);
  return prestador;
}

// RF-04: lista TODOS los sitios propios del prestador (incluye inactivos), a diferencia del catálogo público.
async function misSitios(usuario_id) {
  const prestador = await perfilDe(usuario_id);
  return SitioTuristico.unscoped().findAll({ // unscoped: el negocio dueño sí ve por qué ocultaron su servicio
    where: { prestador_id: prestador.id, estado: { [Op.ne]: "archivado" } },
    include: [
      { model: TarifaTemporada, as: "tarifas" },
      { model: ImagenSitio, as: "imagenes", attributes: ["id", "imagen_url", "orden"], separate: true, order: [["orden", "ASC"]] },
    ],
    order: [["nombre", "ASC"], [{ model: TarifaTemporada, as: "tarifas" }, "fecha_desde", "ASC"]],
  });
}

// Métricas reales por servicio: reservas, ingresos confirmados y calificación.
async function resumenServicios(usuario_id) {
  const prestador = await perfilDe(usuario_id);
  const reservas = await Reserva.findAll({
    where: { prestador_id: prestador.id },
    attributes: ["sitio_id", "estado", "personas", "total", "paquete_id"],
    raw: true,
  });
  const calificaciones = await Resena.findAll({
    attributes: ["sitio_id", [fn("AVG", col("calificacion")), "promedio"], [fn("COUNT", col("Resena.id")), "total"]],
    include: [{ model: SitioTuristico, attributes: [], where: { prestador_id: prestador.id } }],
    group: ["Resena.sitio_id"],
    raw: true,
  });

  const resumen = {};
  const base = () => ({ reservas_total: 0, pendientes: 0, confirmadas: 0, personas_confirmadas: 0, ingresos: 0, promedio: null, total_resenas: 0 });
  for (const r of reservas.filter((r) => !r.paquete_id)) {
    const x = (resumen[r.sitio_id] ||= base());
    x.reservas_total += 1;
    if (r.estado === "pendiente") x.pendientes += 1;
    if (r.estado === "confirmada" || r.estado === "completada") { x.confirmadas += 1; x.personas_confirmadas += r.personas; x.ingresos += Number(r.total); }
  }
  for (const c of calificaciones) {
    const x = (resumen[c.sitio_id] ||= base());
    x.promedio = Math.round(Number(c.promedio) * 10) / 10;
    x.total_resenas = Number(c.total);
  }
  return resumen;
}

// Reseñas de los servicios y de los paquetes de un negocio, juntas y de la más nueva a la más antigua.
function resenasDelNegocio(prestador_id, atributos) {
  return Resena.findAll({
    where: { [Op.or]: [{ "$SitioTuristico.prestador_id$": prestador_id }, { "$Paquete.prestador_id$": prestador_id }] },
    include: [
      { model: SitioTuristico, required: false, attributes: atributos },
      { model: Paquete, required: false, attributes: atributos },
      { model: Usuario, as: "turista", attributes: ["id", "nombre"] },
    ],
    order: [["fecha", "DESC"]],
  });
}

// Reseñas que recibieron los servicios del prestador (para responderlas).
async function resenasRecibidas(usuario_id) {
  const prestador = await perfilDe(usuario_id);
  return resenasDelNegocio(prestador.id, ["id", "nombre", "prestador_id"]);
}

// Página pública del negocio: contacto, servicios, paquetes y reseñas. Solo negocios aprobados y con cuenta activa.
async function perfilPublico(id) {
  const prestador = await Prestador.findByPk(id, { include: [{ model: Usuario, attributes: ["fecha_registro", "activo"] }] });
  if (!prestador || prestador.estado_verificacion !== "aprobado" || !prestador.Usuario?.activo) {
    throw new ErrorHttp(404, "Negocio no encontrado.");
  }

  const sitios = await SitioTuristico.findAll({ where: { prestador_id: prestador.id, estado: "activo" }, order: [["nombre", "ASC"]] });
  const servicios = await adjuntarResumen(sitios.map((s) => s.toJSON()));
  const paquetes = await paqueteService.listarPublicos({ prestador_id: prestador.id });

  const resenas = await resenasDelNegocio(prestador.id, ["id", "nombre"]);
  const total = resenas.length;
  const promedio = total ? Math.round((resenas.reduce((s, r) => s + r.calificacion, 0) / total) * 10) / 10 : null;

  return {
    id: prestador.id,
    nombre_negocio: prestador.nombre_negocio,
    categoria: prestador.categoria,
    municipio: prestador.municipio,
    descripcion: prestador.descripcion,
    telefono: prestador.telefono,
    direccion: prestador.direccion,
    redes: prestador.redes,
    miembro_desde: prestador.Usuario.fecha_registro,
    servicios,
    paquetes,
    resenas: { total, promedio, recientes: resenas.slice(0, 6).map(resenaPublica) },
  };
}

// RF-02: crear el perfil de negocio del prestador autenticado. Nace "incompleto": hasta aprobarse no publica.
async function crearPerfil(usuario, datos) {
  if (usuario.rol !== "prestador") throw new ErrorHttp(403, "Solo un usuario con rol prestador puede crear un perfil de negocio.");
  if (await prestadorDeUsuario(usuario.id)) throw new ErrorHttp(400, "Ya existe un perfil de negocio para este usuario.");

  const { nombre_negocio, categoria, municipio, descripcion, telefono, direccion, redes } = datos;
  if (!nombre_negocio || !categoria || !municipio) throw new ErrorHttp(400, "nombre_negocio, categoria y municipio son obligatorios.");

  return Prestador.create({
    usuario_id: usuario.id, nombre_negocio, categoria, municipio, descripcion, telefono, direccion, redes,
    estado_verificacion: "incompleto",
  });
}

// RF-02: editar el perfil. Guardar no cambia el estado: el borrador sigue "incompleto" (o "rechazado") hasta enviarse a revisión.
async function actualizarPerfil(id, usuario, datos) {
  const prestador = await perfilPropio(id, usuario, "No puede editar el perfil de otro prestador.");
  const { nombre_negocio, categoria, municipio, descripcion, telefono, direccion, redes } = datos;
  await prestador.update({ nombre_negocio, categoria, municipio, descripcion, telefono, direccion, redes });
  return prestador;
}

// El prestador termina su perfil y lo envía a revisión (también para reenviar uno rechazado) y se avisa a los administradores.
async function enviarARevision(id, usuario) {
  const prestador = await perfilPropio(id, usuario, "No puede enviar el perfil de otro prestador.");
  if (prestador.estado_verificacion !== "incompleto" && prestador.estado_verificacion !== "rechazado") {
    throw new ErrorHttp(400, "Tu negocio ya fue enviado a revisión.");
  }
  const faltan = camposFaltantes(prestador);
  if (faltan.length > 0) {
    throw new ErrorHttp(400, `Antes de enviarlo a revisión te falta: ${faltan.join(", ")}.`, { faltan });
  }

  await prestador.update({ estado_verificacion: "pendiente", motivo_rechazo: null });
  const admins = await Usuario.findAll({ where: { rol: "administrador", activo: true }, attributes: ["id"] });
  await notificarVarios(admins.map((a) => a.id), "prestador_nuevo", `El negocio "${prestador.nombre_negocio}" (${prestador.municipio}) está listo para revisión.`);
  return prestador;
}

const CON_USUARIO = [{ model: Usuario, attributes: ["nombre", "correo"] }];

// RF-03: prestadores pendientes de verificación.
const listarPendientes = () => Prestador.findAll({ where: { estado_verificacion: "pendiente" }, include: CON_USUARIO });

// Todos los prestadores, con filtro opcional por estado de verificación.
const listarTodos = (estado) => Prestador.findAll({ where: Prestador.rawAttributes.estado_verificacion.values.includes(estado) ? { estado_verificacion: estado } : {}, include: CON_USUARIO, order: [["id", "DESC"]] });

// RF-03 / RN-01: aprobar o rechazar un prestador; al rechazar se explica el motivo y se notifica.
async function verificar(id, { estado_verificacion, motivo }, actor_id) {
  const prestador = await Prestador.findByPk(id);
  if (!prestador) throw new ErrorHttp(404, "Prestador no encontrado.");
  if (prestador.estado_verificacion === "incompleto") throw new ErrorHttp(400, "Este negocio aún no terminó su perfil ni lo envió a revisión.");

  await prestador.update({
    estado_verificacion,
    motivo_rechazo: estado_verificacion === "rechazado" ? motivo || null : null,
  });
  await auditoria.registrar({
    actor_id, accion: estado_verificacion === "aprobado" ? "negocio_aprobado" : "negocio_rechazado", entidad: "negocio", entidad_id: prestador.id,
    detalle: `${prestador.nombre_negocio}${motivo ? ` — motivo: ${motivo}` : ""}`,
  });
  const aprobado = estado_verificacion === "aprobado";
  await notificar(prestador.usuario_id, aprobado ? "prestador_aprobado" : "prestador_rechazado", aprobado
      ? `¡Tu negocio "${prestador.nombre_negocio}" fue aprobado! Ya puedes publicar tus servicios.`
      : `Tu negocio "${prestador.nombre_negocio}" fue rechazado.${motivo ? ` Motivo: ${motivo}` : ""} Puedes corregir tu perfil y volver a enviarlo.`);
  return prestador;
}

module.exports = { perfilDe, misSitios, resumenServicios, resenasRecibidas, perfilPublico, crearPerfil, actualizarPerfil, enviarARevision, listarPendientes, listarTodos, verificar };
