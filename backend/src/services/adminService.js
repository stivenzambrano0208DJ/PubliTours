const { Op } = require("sequelize");
const { Usuario, Prestador, SitioTuristico, Resena, Paquete, PaqueteItem } = require("../models");
const { adjuntarResumen } = require("./resenaService");
const { notificar } = require("./notificacionService");
const auditoria = require("./auditoriaService");
const { ErrorHttp } = require("../utils/errores");
const politicas = require("../politicas");

// Gestión y moderación del administrador. El administrador verifica y modera; el catálogo lo edita solo cada prestador.

// Los listados de moderación devuelven los más recientes (hasta este tope); para llegar a lo antiguo se usa la búsqueda.
const LIMITE_LISTADO = 500;

const buscarTexto = (texto, campos) => ({ [Op.or]: campos.map((campo) => ({ [campo]: { [Op.iLike]: `%${texto}%` } })) });

// ---------------- Usuarios ----------------

// Listado con búsqueda por nombre o correo y filtro por rol.
function listarUsuarios({ texto, rol }) {
  const where = { eliminado_en: null };
  if (Usuario.rawAttributes.rol.values.includes(rol)) where.rol = rol;
  if (texto) Object.assign(where, buscarTexto(texto, ["nombre", "correo"]));
  return Usuario.findAll({
    where,
    attributes: ["id", "nombre", "correo", "rol", "activo", "fecha_registro"],
    include: [{ model: Prestador, attributes: ["id", "nombre_negocio", "estado_verificacion"] }],
    order: [["fecha_registro", "DESC"]],
    limit: LIMITE_LISTADO,
  });
}

// Suspender o reactivar una cuenta. No se puede suspender a un administrador (ni a uno mismo).
async function cambiarEstadoUsuario({ id, activo, actor_id }) {
  const usuario = await Usuario.findByPk(id);
  if (!usuario) throw new ErrorHttp(404, "Usuario no encontrado.");
  politicas.cuentas.exigirSuspenderCuenta(usuario);
  if (usuario.eliminado_en) throw new ErrorHttp(400, "Esta cuenta fue eliminada por su dueño.");
  await usuario.update({ activo: !!activo });
  await auditoria.registrar({
    actor_id, accion: usuario.activo ? "usuario_reactivado" : "usuario_suspendido", entidad: "usuario", entidad_id: usuario.id, detalle: usuario.correo,
  });
  return { id: usuario.id, activo: usuario.activo };
}

// ---------------- Servicios y paquetes ----------------

// Moderación: todos los servicios (incluye ocultos) con su prestador y calificación.
async function listarSitios({ texto, estado }) {
  const where = { estado: SitioTuristico.rawAttributes.estado.values.includes(estado) ? estado : { [Op.ne]: "archivado" } };
  if (texto) Object.assign(where, buscarTexto(texto, ["nombre", "municipio"]));
  const sitios = await SitioTuristico.unscoped().findAll({ // unscoped: la administración ve el motivo de cada moderación
    where,
    include: [{ model: Prestador, attributes: ["id", "nombre_negocio"] }],
    order: [["id", "DESC"]],
    limit: LIMITE_LISTADO,
  });
  return adjuntarResumen(sitios.map((s) => s.toJSON()));
}

async function listarPaquetes({ texto }) {
  const where = { estado: { [Op.ne]: "archivado" } };
  if (texto) Object.assign(where, buscarTexto(texto, ["nombre"]));
  const paquetes = await Paquete.unscoped().findAll({
    where,
    include: [
      { model: Prestador, attributes: ["id", "nombre_negocio"] },
      { model: PaqueteItem, as: "items", include: [{ model: SitioTuristico, as: "sitio", attributes: ["id", "nombre"] }] },
    ],
    order: [["id", "DESC"]],
    limit: LIMITE_LISTADO,
  });
  return adjuntarResumen(paquetes.map((p) => p.toJSON()), "paquete_id");
}

// Un servicio y un paquete se moderan igual: lo único que cambia son los textos y la entidad.
const MODERABLES = {
  sitio: {
    Modelo: SitioTuristico, nombre: "servicio", entidad: "servicio", noEncontrado: "Sitio no encontrado.",
    soloPublicado: "Solo se puede ocultar un servicio publicado.", noOculto: "Ese servicio no está oculto por el administrador.",
    accion: { oculto: "servicio_ocultado", activo: "servicio_publicado" },
  },
  paquete: {
    Modelo: Paquete, nombre: "paquete", entidad: "paquete", noEncontrado: "Paquete no encontrado.",
    soloPublicado: "Solo se puede ocultar un paquete publicado.", noOculto: "Ese paquete no está oculto por el administrador.",
    accion: { oculto: "paquete_ocultado", activo: "paquete_publicado" },
  },
};

// Ocultar o volver a publicar; al ocultar se avisa al prestador con el motivo.
// "oculto" lo pone el administrador y el prestador no puede revertirlo (lo pausado por el prestador no se toca).
async function moderar(tipo, { id, estado, motivo, actor_id }) {
  const m = MODERABLES[tipo];
  const elemento = await m.Modelo.findByPk(id);
  if (!elemento || elemento.estado === "archivado") throw new ErrorHttp(404, m.noEncontrado);
  if (estado === "oculto" && elemento.estado !== "activo") throw new ErrorHttp(400, m.soloPublicado);
  if (estado === "activo" && elemento.estado !== "oculto") throw new ErrorHttp(400, m.noOculto);

  await elemento.update({ estado, motivo_moderacion: estado === "oculto" ? motivo || null : null });
  await auditoria.registrar({
    actor_id, accion: m.accion[estado], entidad: m.entidad, entidad_id: elemento.id, detalle: `${elemento.nombre}${motivo ? ` — motivo: ${motivo}` : ""}`,
  });

  // Los servicios cargados por el administrador no tienen prestador a quien avisar.
  const prestador = elemento.prestador_id ? await Prestador.findByPk(elemento.prestador_id) : null;
  if (prestador) {
    await notificar(
      prestador.usuario_id,
      estado === "oculto" ? "sitio_oculto" : "sitio_publicado",
      estado === "oculto"
        ? `El administrador ocultó tu ${m.nombre} "${elemento.nombre}".${motivo ? ` Motivo: ${motivo}` : ""}`
        : `El administrador volvió a publicar tu ${m.nombre} "${elemento.nombre}".`
    );
  }
  return elemento;
}

const moderarSitio = (datos) => moderar("sitio", datos);
const moderarPaquete = (datos) => moderar("paquete", datos);

// ---------------- Reseñas ----------------

const listarResenas = () => Resena.findAll({
  include: [
    { model: SitioTuristico, required: false, attributes: ["id", "nombre"] },
    { model: Paquete, required: false, attributes: ["id", "nombre"] },
    { model: Usuario, as: "turista", attributes: ["id", "nombre", "correo"] },
  ],
  order: [["fecha", "DESC"]],
  limit: LIMITE_LISTADO,
});

// Retira una reseña inapropiada y avisa a su autor.
async function eliminarResena({ id, actor_id }) {
  const resena = await Resena.findByPk(id, { include: [{ model: SitioTuristico, attributes: ["nombre"] }, { model: Paquete, attributes: ["nombre"] }] });
  if (!resena) throw new ErrorHttp(404, "Reseña no encontrada.");
  const objeto = (resena.SitioTuristico || resena.Paquete).nombre;
  await notificar(resena.turista_id, "resena_retirada", `Tu reseña de "${objeto}" fue retirada por el administrador por no cumplir las normas de la comunidad.`);
  await auditoria.registrar({
    actor_id, accion: "resena_retirada", entidad: "resena", entidad_id: resena.id, detalle: `${objeto} — ${resena.calificacion} estrella(s)`,
  });
  await resena.destroy();
}

module.exports = {
  listarUsuarios, cambiarEstadoUsuario, listarSitios, listarPaquetes, moderarSitio, moderarPaquete, listarResenas, eliminarResena,
};
