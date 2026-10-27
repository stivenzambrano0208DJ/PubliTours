const { z } = require("zod");
const { POLITICAS_CANCELACION } = require("../config/negocio");
const { esFechaReal } = require("../utils/fechas");
const { TEXTO_MAX, MOTIVOS_REPORTE } = require("../config/mensajeria");

// Un precio mayor no cabe en las columnas numeric(10,2) de la base de datos (daba un error 500 en vez de un mensaje claro).
const PRECIO_MAXIMO = 99999999;

const politicaCancelacion = z.enum(Object.keys(POLITICAS_CANCELACION), { message: "Elige una política de cancelación válida." }).optional();

// Fecha AAAA-MM-DD que además existe en el calendario (no "2031-02-31").
const fechaISO = (mensaje) => z.string().regex(/^\d{4}-\d{2}-\d{2}$/, mensaje).refine(esFechaReal, "Esa fecha no existe en el calendario.");

const vacioANulo = (v) => (v === "" || v === undefined ? null : v);
const texto = (max) => z.string().trim().max(max);
const textoOpcional = (max) => z.preprocess(vacioANulo, texto(max).nullable().optional());
const numeroOpcional = (min, max) =>
  z.preprocess(vacioANulo, z.coerce.number().min(min).max(max).nullable().optional());

const auth = {
  verificarCorreo: z.object({ codigo: z.string().trim().regex(/^\d{6}$/, "El código debe tener 6 dígitos.") }),
  perfil: z.object({
    nombre: texto(120).min(2, "El nombre debe tener al menos 2 caracteres."),
    correo: z.string().trim().toLowerCase().email("Correo electrónico inválido.").max(150),
  }),
  eliminarCuenta: z.object({ password: z.string().min(1, "Escribe tu contraseña para confirmar.") }),
  cambiarPassword: z.object({
    actual: z.string().min(1, "Escribe tu contraseña actual."),
    nueva: z.string().min(8, "La contraseña debe tener al menos 8 caracteres.").max(100),
  }),
  registro: z.object({
    nombre: texto(120).min(2, "El nombre debe tener al menos 2 caracteres."),
    correo: z.string().trim().toLowerCase().email("Correo electrónico inválido.").max(150),
    password: z.string().min(8, "La contraseña debe tener al menos 8 caracteres.").max(100),
    rol: z.enum(["turista", "prestador"]).optional().catch("turista"),
    acepta_terminos: z.literal(true, { message: "Debes aceptar los Términos y Condiciones y la Política de Privacidad." }),
    // Un prestador entrega los datos de su negocio al registrarse (el perfil nace pendiente de verificación).
    negocio: z.lazy(() => negocioRegistro).optional(),
  }),
  login: z.object({
    correo: z.string().trim().toLowerCase().min(1, "El correo es obligatorio."),
    password: z.string().min(1, "La contraseña es obligatoria."),
  }),
  olvidePassword: z.object({
    correo: z.string().trim().toLowerCase().email("Correo electrónico inválido."),
  }),
  restablecerPassword: z.object({
    correo: z.string().trim().toLowerCase().email("Correo electrónico inválido."),
    codigo: z.string().regex(/^\d{6}$/, "El código debe tener 6 dígitos."),
    password: z.string().min(8, "La contraseña debe tener al menos 8 caracteres.").max(100),
  }),
};

const prestador = z.object({
  nombre_negocio: texto(150).min(1, "El nombre del negocio es obligatorio."),
  categoria: texto(60).min(1, "La categoría es obligatoria."),
  municipio: texto(80).min(1, "El municipio es obligatorio."),
  descripcion: textoOpcional(2000),
  direccion: textoOpcional(200),
  redes: textoOpcional(200),
  telefono: z.preprocess(
    vacioANulo,
    z.string().regex(/^\d{7,15}$/, "El teléfono debe tener entre 7 y 15 dígitos.").nullable().optional()
  ),
});

// Al registrarse solo se piden los datos básicos del negocio; el resto se completa después en el portal.
const negocioRegistro = prestador.pick({ nombre_negocio: true, categoria: true, municipio: true });

const temporada = z.object({
  nombre: texto(80).min(1, "La temporada necesita un nombre."),
  fecha_desde: fechaISO("La fecha de inicio de la temporada no es válida."),
  fecha_hasta: fechaISO("La fecha final de la temporada no es válida."),
  precio: z.coerce.number().min(0, "El precio de la temporada no puede ser negativo.").max(PRECIO_MAXIMO),
  precio_nino: z.preprocess(vacioANulo, z.coerce.number().min(0).max(PRECIO_MAXIMO).nullable().optional()),
}).refine((t) => t.fecha_hasta >= t.fecha_desde, { message: "La temporada termina antes de empezar.", path: ["fecha_hasta"] });

const sitio = z.object({
  nombre: texto(150).min(1, "El nombre es obligatorio."),
  categoria: texto(60).min(1, "La categoría es obligatoria."),
  municipio: texto(80).min(1, "El municipio es obligatorio."),
  precio: z.preprocess((v) => (v === "" || v == null ? 0 : v), z.coerce.number().min(0, "El precio no puede ser negativo.").max(PRECIO_MAXIMO)),
  horario: textoOpcional(100),
  descripcion: textoOpcional(4000),
  tipo_viaje: textoOpcional(150),
  estado: z.enum(["activo", "inactivo"]).optional(),
  latitud: numeroOpcional(-90, 90),
  longitud: numeroOpcional(-180, 180),
  prestador_id: z.preprocess(vacioANulo, z.coerce.number().int().positive().nullable().optional()),
  capacidad: z.preprocess(vacioANulo, z.coerce.number().int().min(1, "Los cupos deben ser al menos 1.").max(10000).nullable().optional()),
  politica_cancelacion: politicaCancelacion,
  precio_nino: numeroOpcional(0, PRECIO_MAXIMO),
  grupo_min_personas: z.preprocess(vacioANulo, z.coerce.number().int().min(2, "El descuento por grupo empieza desde 2 personas.").max(1000).nullable().optional()),
  grupo_descuento_pct: z.preprocess(vacioANulo, z.coerce.number().int().min(1, "El descuento debe ser de 1 % a 90 %.").max(90, "El descuento debe ser de 1 % a 90 %.").nullable().optional()),
  // Con foto el formulario viaja como multipart y la lista de temporadas llega como texto JSON.
  temporadas: z.preprocess((v) => {
    if (typeof v !== "string") return v;
    try { return JSON.parse(v); } catch { return v; }
  }, z.array(temporada).max(12, "Máximo 12 temporadas.").optional()),
}).refine((d) => Boolean(d.grupo_min_personas) === Boolean(d.grupo_descuento_pct), {
  message: "Para el descuento por grupo indica desde cuántas personas y el porcentaje.", path: ["grupo_descuento_pct"],
});

const reserva = z.object({
  sitio_id: z.preprocess(vacioANulo, z.coerce.number().int().positive("sitio_id inválido.").nullable().optional()),
  paquete_id: z.preprocess(vacioANulo, z.coerce.number().int().positive("paquete_id inválido.").nullable().optional()),
  fecha_servicio: fechaISO("fecha_servicio debe tener formato AAAA-MM-DD."),
  personas: z.preprocess((v) => (v === "" || v == null ? 1 : v), z.coerce.number().int().min(1, "Debe ser al menos 1 persona.").max(500)),
  ninos: z.preprocess((v) => (v === "" || v == null ? 0 : v), z.coerce.number().int().min(0).max(500)),
  nota: textoOpcional(500),
}).refine((d) => Boolean(d.sitio_id) !== Boolean(d.paquete_id), { message: "Indica un servicio o un paquete (solo uno).", path: ["sitio_id"] });

const edicionReserva = z.object({
  fecha_servicio: fechaISO("fecha_servicio debe tener formato AAAA-MM-DD."),
  personas: z.coerce.number().int().min(1, "Debe ser al menos 1 persona.").max(500),
  ninos: z.preprocess((v) => (v === "" || v == null ? 0 : v), z.coerce.number().int().min(0).max(500)),
  nota: textoOpcional(500).optional(),
});

const paquete = z.object({
  nombre: texto(150).min(3, "El nombre debe tener al menos 3 caracteres."),
  descripcion: textoOpcional(2000),
  precio: z.coerce.number().min(0, "El precio no puede ser negativo.").max(PRECIO_MAXIMO),
  capacidad: z.preprocess(vacioANulo, z.coerce.number().int().min(1, "Los cupos deben ser al menos 1.").max(10000).nullable().optional()),
  politica_cancelacion: politicaCancelacion,
  estado: z.enum(["activo", "inactivo"]).optional(),
  // Con foto, el formulario viaja como multipart y la lista de servicios llega como texto JSON.
  sitios: z.preprocess((v) => {
    if (typeof v !== "string") return v;
    try { return JSON.parse(v); } catch { return v; }
  }, z.array(z.object({
    sitio_id: z.coerce.number().int().positive(),
    dia: z.coerce.number().int().min(1).max(30).default(1),
  })).min(2, "Un paquete necesita al menos 2 servicios.").max(15, "Máximo 15 servicios por paquete.")),
});

const estadoPaquete = z.object({ estado: z.enum(["activo", "inactivo"]) });

const asistencia = z.object({ asistio: z.boolean({ message: "Indica si el turista asistió." }) });

const rechazo = z.object({ motivo: textoOpcional(300) });

const respuestaResena = z.object({ respuesta: texto(1000).min(1, "Escribe tu respuesta.") });

const fechaBloqueada = z.object({
  fecha: fechaISO("La fecha debe tener formato AAAA-MM-DD."),
  motivo: textoOpcional(150),
});

const anuncio = z.object({
  mensaje: z.string().trim().min(10, "El anuncio debe tener al menos 10 caracteres.").max(500, "El anuncio no puede superar 500 caracteres."),
  destinatarios: z.enum(["todos", "aprobados"], { message: "Elige a quién va dirigido el anuncio." }),
});
const estadoUsuario = z.object({ activo: z.boolean({ message: "Indica si la cuenta queda activa." }) });

const moderarSitio = z.object({
  estado: z.enum(["activo", "oculto"]),
  motivo: textoOpcional(300),
});

const verificarPrestador = z.object({
  estado_verificacion: z.enum(["aprobado", "rechazado"], { message: "estado_verificacion debe ser 'aprobado' o 'rechazado'." }),
  motivo: textoOpcional(500),
});

const resena = z.object({
  calificacion: z.coerce.number().int().min(1, "La calificación va de 1 a 5.").max(5, "La calificación va de 1 a 5."),
  comentario: textoOpcional(1000),
});

const interpretarViaje = z.object({
  texto: texto(600).min(5, "Cuéntanos un poco más sobre tu viaje."),
});

const itinerario = z.object({
  presupuesto: z.coerce.number().positive("El presupuesto debe ser mayor a cero.").max(1000000000),
  dias: z.coerce.number().int().min(1, "Debe ser al menos 1 día.").max(30, "Máximo 30 días."),
  personas: z.preprocess((v) => (v === "" || v == null ? 1 : v), z.coerce.number().int().min(1, "Debe ser al menos 1 persona.").max(100)),
  fecha_inicio: z.preprocess(vacioANulo, fechaISO("La fecha de inicio debe tener formato AAAA-MM-DD.").nullable().optional()),
  preferencias: textoOpcional(500),
  municipio: z.preprocess((v) => (v === "" ? undefined : v), z.string().trim().max(80).optional()),
  categoria: z.preprocess((v) => (v === "" ? undefined : v), z.string().trim().max(60).optional()),
});

// Mensajería. Con fotos la petición viaja como multipart: los ids llegan como texto y se convierten.
const idOpcional = z.preprocess(vacioANulo, z.coerce.number().int().positive().nullable().optional());
const mensajeNuevo = z.object({
  sitio_id: idOpcional,
  paquete_id: idOpcional,
  reserva_id: idOpcional,
  texto: textoOpcional(TEXTO_MAX),
}).refine((d) => [d.sitio_id, d.paquete_id, d.reserva_id].filter(Boolean).length === 1, {
  message: "Indica sobre qué servicio, paquete o reserva quieres preguntar.", path: ["sitio_id"],
});
const mensajeEnvio = z.object({ texto: textoOpcional(TEXTO_MAX) });
const reporteMensaje = z.object({
  motivo: z.enum(MOTIVOS_REPORTE, { message: "Elige un motivo para el reporte." }),
  detalle: textoOpcional(300),
});
const resolverReporteMensaje = z.object({ accion: z.enum(["descartar", "retirar"], { message: "Elige una acción válida." }) });

module.exports = { mensajeNuevo, mensajeEnvio, reporteMensaje, resolverReporteMensaje, auth, prestador, sitio, reserva, edicionReserva, paquete, estadoPaquete, estadoUsuario, anuncio, moderarSitio, verificarPrestador, asistencia, rechazo, respuestaResena, fechaBloqueada, resena, interpretarViaje, itinerario };
