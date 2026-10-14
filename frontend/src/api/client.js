// Vacío = el navegador usa el mismo origen desde el que cargó la página (despliegue con nginx); sin definir, el backend local.
const ORIGIN = import.meta.env.VITE_API_ORIGIN ?? "http://localhost:4000";
const BASE_URL = `${ORIGIN}/api/v1`;

export function urlImagen(imagen_url) {
  return imagen_url ? `${ORIGIN}${imagen_url}` : null;
}

// La sesión vive en una cookie HttpOnly que el servidor pone y borra: este código nunca ve el token. Solo se recuerda, sin ningún
// secreto, que hay una sesión abierta; así un visitante no consulta "quién soy" en cada carga.
const CLAVE_SESION = "publitours_sesion";
const CABECERA_CLIENTE = { "X-Requested-With": "PubliTours" }; // el servidor la exige a las peticiones que cambian datos (defensa CSRF)

try { localStorage.removeItem("publitours_token"); } catch { /* sin almacenamiento */ } // el token de versiones anteriores ya no se usa

export function haySesion() {
  try { return localStorage.getItem(CLAVE_SESION) === "1"; } catch { return false; }
}

export function marcarSesion(activa) {
  try {
    if (activa) localStorage.setItem(CLAVE_SESION, "1");
    else localStorage.removeItem(CLAVE_SESION);
  } catch { /* sin almacenamiento: la sesión sigue en la cookie */ }
}

// Se emite cuando el servidor rechaza una sesión que se creía abierta (venció, o se cambió la contraseña en otro lado): ya no vale.
export const EVENTO_SESION_EXPIRADA = "publitours:sesion-expirada";
function sesionExpirada() {
  marcarSesion(false);
  window.dispatchEvent(new Event(EVENTO_SESION_EXPIRADA));
}

async function request(path, { method = "GET", body, auth = false } = {}) {
  const esFormData = typeof FormData !== "undefined" && body instanceof FormData;
  const headers = { ...CABECERA_CLIENTE };
  if (!esFormData) headers["Content-Type"] = "application/json";
  const conSesion = auth && haySesion();

  const res = await fetch(`${BASE_URL}${path}`, {
    method,
    headers,
    credentials: "include",
    body: esFormData ? body : (body ? JSON.stringify(body) : undefined),
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    if (res.status === 401 && conSesion) sesionExpirada();
    throw new Error(data.error || "Ocurrió un error inesperado.");
  }
  return data;
}

// Los archivos (CSV) no son JSON: se piden aparte y se entregan como Blob para descargar.
async function descargarBlob(path, params) {
  const conSesion = haySesion();
  const res = await fetch(`${BASE_URL}${path}?${new URLSearchParams(params)}`, { headers: CABECERA_CLIENTE, credentials: "include" });
  if (res.status === 401 && conSesion) sesionExpirada();
  if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error || "No se pudo generar el archivo.");
  return res.blob();
}

// Un mensaje con fotos viaja como multipart (cada foto en el campo "imagenes"); sin fotos va como JSON normal.
function mensajeAFormData(payload, fotos = []) {
  if (fotos.length === 0) return payload;
  const fd = new FormData();
  for (const [clave, valor] of Object.entries(payload)) if (valor !== undefined && valor !== null && valor !== "") fd.append(clave, valor);
  for (const foto of fotos) fd.append("imagenes", foto);
  return fd;
}

// Las fotos de las conversaciones son privadas: se piden con la sesión (cookie) a una ruta que comprueba que la persona participa.
export const urlFotoMensaje = (id) => `${BASE_URL}/conversaciones/imagenes/${id}`;

// Con foto de portada el paquete viaja como multipart; la lista de servicios va como texto JSON.
function paqueteAFormData(payload, imagenFile) {
  if (!imagenFile) return payload;
  const fd = new FormData();
  Object.entries(payload).forEach(([k, v]) => fd.append(k, k === "sitios" ? JSON.stringify(v) : v ?? ""));
  fd.append("imagen", imagenFile);
  return fd;
}

function aFormDataSiConHayImagen(payload, imagenFile) {
  if (!imagenFile) return payload;
  const fd = new FormData();
  Object.entries(payload).forEach(([k, v]) => fd.append(k, v !== null && typeof v === "object" ? JSON.stringify(v) : v ?? ""));
  fd.append("imagen", imagenFile);
  return fd;
}

export const api = {
  registro: (payload) => request("/auth/registro", { method: "POST", body: payload }),
  login: (payload) => request("/auth/login", { method: "POST", body: payload }),
  logout: () => request("/auth/logout", { method: "POST" }),
  me: () => request("/usuarios/me", { auth: true }),
  olvidePassword: (correo) => request("/auth/olvide-password", { method: "POST", body: { correo } }),
  restablecerPassword: (correo, codigo, password) => request("/auth/restablecer-password", { method: "POST", body: { correo, codigo, password } }),
  buscarSitios: (params) => {
    const query = new URLSearchParams(
      Object.entries(params).filter(([, v]) => v !== "" && v !== undefined && v !== null)
    ).toString();
    return request(`/sitios?${query}`);
  },
  obtenerSitio: (id) => request(`/sitios/${id}`),

  negocioPublico: (id) => request(`/prestadores/${id}/publico`),

  // Prestador (RF-02, RF-03)
  miPerfilPrestador: () => request("/prestadores/me", { auth: true }),
  misSitios: () => request("/prestadores/me/sitios", { auth: true }),
  crearPerfilPrestador: (payload) => request("/prestadores", { method: "POST", body: payload, auth: true }),
  actualizarPerfilPrestador: (id, payload) => request(`/prestadores/${id}`, { method: "PUT", body: payload, auth: true }),
  enviarRevisionPrestador: (id) => request(`/prestadores/${id}/enviar-revision`, { method: "POST", auth: true }),
  prestadoresPendientes: () => request("/prestadores/pendientes", { auth: true }),
  verificarPrestador: (id, estado_verificacion, motivo) =>
    request(`/prestadores/${id}/verificar`, { method: "PATCH", body: { estado_verificacion, motivo }, auth: true }),

  // Administración
  usuariosAdmin: (params = {}) => {
    const q = new URLSearchParams(Object.entries(params).filter(([, v]) => v)).toString();
    return request(`/admin/usuarios${q ? `?${q}` : ""}`, { auth: true });
  },
  estadoUsuario: (id, activo) => request(`/admin/usuarios/${id}/estado`, { method: "PATCH", body: { activo }, auth: true }),
  sitiosAdmin: (params = {}) => {
    const q = new URLSearchParams(Object.entries(params).filter(([, v]) => v)).toString();
    return request(`/admin/sitios${q ? `?${q}` : ""}`, { auth: true });
  },
  paquetesAdmin: (params = {}) => {
    const q = new URLSearchParams(Object.entries(params).filter(([, v]) => v)).toString();
    return request(`/admin/paquetes${q ? `?${q}` : ""}`, { auth: true });
  },
  moderarPaquete: (id, estado, motivo) => request(`/admin/paquetes/${id}/estado`, { method: "PATCH", body: { estado, motivo }, auth: true }),
  moderarSitio: (id, estado, motivo) => request(`/admin/sitios/${id}/estado`, { method: "PATCH", body: { estado, motivo }, auth: true }),
  resenasAdmin: () => request("/admin/resenas", { auth: true }),
  eliminarResenaAdmin: (id) => request(`/admin/resenas/${id}`, { method: "DELETE", auth: true }),

  // Catálogo — gestión propia del prestador (RF-04)
  crearSitio: (payload, imagenFile) =>
    request("/sitios", { method: "POST", body: aFormDataSiConHayImagen(payload, imagenFile), auth: true }),
  actualizarSitio: (id, payload, imagenFile) =>
    request(`/sitios/${id}`, { method: "PUT", body: aFormDataSiConHayImagen(payload, imagenFile), auth: true }),
  agregarImagenesSitio: (id, files) => {
    const fd = new FormData();
    Array.from(files).forEach((f) => fd.append("imagenes", f));
    return request(`/sitios/${id}/imagenes`, { method: "POST", body: fd, auth: true });
  },
  eliminarSitio: (id) => request(`/sitios/${id}`, { method: "DELETE", auth: true }),
  fechasBloqueadas: (id) => request(`/sitios/${id}/fechas-bloqueadas`),
  bloquearFecha: (id, payload) => request(`/sitios/${id}/fechas-bloqueadas`, { method: "POST", body: payload, auth: true }),
  desbloquearFecha: (id, fechaId) => request(`/sitios/${id}/fechas-bloqueadas/${fechaId}`, { method: "DELETE", auth: true }),
  estadisticasPrestador: (params) => request(`/prestadores/me/estadisticas?${new URLSearchParams(params)}`, { auth: true }),
  csvEstadisticasPrestador: (params) => descargarBlob("/prestadores/me/estadisticas.csv", params),
  tendenciasAdmin: (params) => request(`/admin/tendencias?${new URLSearchParams(params)}`, { auth: true }),
  csvTendenciasAdmin: (params) => descargarBlob("/admin/tendencias.csv", params),
  auditoriaAdmin: (params) => request(`/admin/auditoria?${new URLSearchParams(params)}`, { auth: true }),
  enviarAnuncio: (payload) => request("/admin/anuncios", { method: "POST", body: payload, auth: true }),
  resumenServicios: () => request("/prestadores/me/resumen", { auth: true }),
  resenasRecibidas: () => request("/prestadores/me/resenas", { auth: true }),
  responderResena: (id, respuesta) => request(`/resenas/${id}/respuesta`, { method: "PUT", body: { respuesta }, auth: true }),
  eliminarImagenSitio: (id, imagenId) => request(`/sitios/${id}/imagenes/${imagenId}`, { method: "DELETE", auth: true }),

  // Paquetes (varios servicios de un prestador, una sola reserva)
  listarPaquetes: (params = {}) => {
    const q = new URLSearchParams(Object.entries(params).filter(([, v]) => v)).toString();
    return request(`/paquetes${q ? `?${q}` : ""}`);
  },
  obtenerPaquete: (id) => request(`/paquetes/${id}`),
  fechasBloqueadasPaquete: (id) => request(`/paquetes/${id}/fechas-bloqueadas`),
  misPaquetes: () => request("/paquetes/mios", { auth: true }),
  crearPaquete: (payload, imagenFile) => request("/paquetes", { method: "POST", body: paqueteAFormData(payload, imagenFile), auth: true }),
  actualizarPaquete: (id, payload, imagenFile) => request(`/paquetes/${id}`, { method: "PUT", body: paqueteAFormData(payload, imagenFile), auth: true }),
  agregarImagenesPaquete: (id, files) => {
    const fd = new FormData();
    Array.from(files).forEach((f) => fd.append("imagenes", f));
    return request(`/paquetes/${id}/imagenes`, { method: "POST", body: fd, auth: true });
  },
  eliminarImagenPaquete: (id, imagenId) => request(`/paquetes/${id}/imagenes/${imagenId}`, { method: "DELETE", auth: true }),
  resenasPaquete: (id) => request(`/paquetes/${id}/resenas`),
  estadoPaquete: (id, estado) => request(`/paquetes/${id}/estado`, { method: "PATCH", body: { estado }, auth: true }),
  eliminarPaquete: (id) => request(`/paquetes/${id}`, { method: "DELETE", auth: true }),

  // Tarifas, disponibilidad y comprobante
  cotizarSitio: (id, { fecha, personas, ninos }) => request(`/sitios/${id}/cotizar?fecha=${fecha}&personas=${personas}&ninos=${ninos || 0}`),
  disponibilidadSitio: (id, mes) => request(`/sitios/${id}/disponibilidad?mes=${mes}`),
  disponibilidadPaquete: (id, mes) => request(`/paquetes/${id}/disponibilidad?mes=${mes}`),
  editarReserva: (id, payload) => request(`/reservas/${id}/editar`, { method: "PATCH", body: payload, auth: true }),
  obtenerReserva: (id) => request(`/reservas/${id}`, { auth: true }),
  verificarReserva: (codigo) => request(`/reservas/verificar/${encodeURIComponent(codigo)}`),

  // Favoritos
  misFavoritos: () => request("/favoritos", { auth: true }),
  agregarFavorito: (sitioId) => request(`/favoritos/${sitioId}`, { method: "POST", auth: true }),
  quitarFavorito: (sitioId) => request(`/favoritos/${sitioId}`, { method: "DELETE", auth: true }),

  // Cuenta del usuario
  actualizarPerfil: (payload) => request("/auth/perfil", { method: "PUT", body: payload, auth: true }),
  cambiarPassword: (payload) => request("/auth/password", { method: "PUT", body: payload, auth: true }),
  configuracion: () => request("/configuracion"),
  misDatos: () => request("/auth/mis-datos", { auth: true }),
  eliminarCuenta: (password) => request("/auth/cuenta", { method: "DELETE", body: { password }, auth: true }),

  // Itinerarios (RF-07)
  interpretarViaje: (texto) => request("/itinerarios/interpretar", { method: "POST", body: { texto }, auth: true }),
  misItinerarios: () => request("/itinerarios", { auth: true }),
  generarItinerario: (payload) => request("/itinerarios", { method: "POST", body: payload, auth: true }),
  compartirItinerario: (id) => request(`/itinerarios/${id}/compartir`, { method: "POST", auth: true }),
  dejarDeCompartirItinerario: (id) => request(`/itinerarios/${id}/compartir`, { method: "DELETE", auth: true }),
  // Mensajería entre turistas y negocios
  conversaciones: () => request("/conversaciones", { auth: true }),
  mensajesSinLeer: () => request("/conversaciones/sin-leer", { auth: true }),
  conversacion: (id, { antes, despues } = {}) => {
    const consulta = new URLSearchParams({ ...(antes ? { antes } : {}), ...(despues ? { despues } : {}) }).toString();
    return request(`/conversaciones/${id}${consulta ? `?${consulta}` : ""}`, { auth: true });
  },
  marcarConversacionLeida: (id) => request(`/conversaciones/${id}/leido`, { method: "PATCH", auth: true }),
  iniciarConversacion: (payload, fotos) => request("/conversaciones", { method: "POST", body: mensajeAFormData(payload, fotos), auth: true }),
  enviarMensaje: (id, texto, fotos) => request(`/conversaciones/${id}/mensajes`, { method: "POST", body: mensajeAFormData({ texto }, fotos), auth: true }),
  reportarMensaje: (mensajeId, payload) => request(`/conversaciones/mensajes/${mensajeId}/reportar`, { method: "POST", body: payload, auth: true }),
  reportesMensajesAdmin: (estado = "pendiente") => request(`/admin/reportes-mensajes?estado=${estado}`, { auth: true }),
  resolverReporteMensajeAdmin: (id, accion) => request(`/admin/reportes-mensajes/${id}`, { method: "PATCH", body: { accion }, auth: true }),
  itinerarioCompartido: (token) => request(`/itinerarios/compartido/${encodeURIComponent(token)}`),

  // Reservas (RF-11 a RF-14)
  solicitarReserva: (payload) => request("/reservas", { method: "POST", body: payload, auth: true }),
  misReservas: () => request("/reservas/mias", { auth: true }),
  reservasRecibidas: () => request("/reservas/recibidas", { auth: true }),
  confirmarReserva: (id) => request(`/reservas/${id}/confirmar`, { method: "PATCH", auth: true }),
  cancelarReserva: (id) => request(`/reservas/${id}/cancelar`, { method: "PATCH", auth: true }),
  calificarReserva: (id, payload) => request(`/reservas/${id}/resena`, { method: "POST", body: payload, auth: true }),
  resenasSitio: (id) => request(`/sitios/${id}/resenas`),
  registrarAsistencia: (id, asistio) => request(`/reservas/${id}/asistencia`, { method: "PATCH", body: { asistio }, auth: true }),
  rechazarReserva: (id, motivo) => request(`/reservas/${id}/rechazar`, { method: "PATCH", body: { motivo }, auth: true }),

  // Notificaciones
  misNotificaciones: () => request("/notificaciones", { auth: true }),
  marcarNotificacionLeida: (id) => request(`/notificaciones/${id}/leido`, { method: "PATCH", auth: true }),

  verificarCorreo: (codigo) => request("/auth/verificar-correo", { method: "POST", body: { codigo }, auth: true }),
  reenviarVerificacion: () => request("/auth/reenviar-verificacion", { method: "POST", auth: true }),

  // Estadísticas (RF-15)
  estadisticasResumen: () => request("/estadisticas/resumen", { auth: true }),
};
