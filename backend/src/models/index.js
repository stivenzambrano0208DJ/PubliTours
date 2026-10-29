const sequelize = require("../config/database");
const Usuario = require("./Usuario");
const Prestador = require("./Prestador");
const SitioTuristico = require("./SitioTuristico");
const ImagenSitio = require("./ImagenSitio");
const Itinerario = require("./Itinerario");
const ItinerarioItem = require("./ItinerarioItem");
const Reserva = require("./Reserva");
const Notificacion = require("./Notificacion");
const PasswordReset = require("./PasswordReset");
const Resena = require("./Resena");
const Favorito = require("./Favorito");
const FechaBloqueada = require("./FechaBloqueada");
const Paquete = require("./Paquete");
const CodigoVerificacion = require("./CodigoVerificacion");
const Auditoria = require("./Auditoria");
const TarifaTemporada = require("./TarifaTemporada");
const PaqueteItem = require("./PaqueteItem");
const ImagenPaquete = require("./ImagenPaquete");
const Conversacion = require("./Conversacion");
const Mensaje = require("./Mensaje");
const MensajeImagen = require("./MensajeImagen");
const ReporteMensaje = require("./ReporteMensaje");
const CasoSoporte = require("./CasoSoporte");
const Invitacion = require("./Invitacion");

// Usuario 1-1 Prestador (RN-09: un usuario tiene un único rol)
Usuario.hasOne(Prestador, { foreignKey: "usuario_id" });
Prestador.belongsTo(Usuario, { foreignKey: "usuario_id" });

// Prestador 1-N SitioTuristico
Prestador.hasMany(SitioTuristico, { foreignKey: "prestador_id" });
SitioTuristico.belongsTo(Prestador, { foreignKey: "prestador_id" });

// SitioTuristico 1-N ImagenSitio (galería de fotos real)
SitioTuristico.hasMany(ImagenSitio, { foreignKey: "sitio_id", as: "imagenes" });
ImagenSitio.belongsTo(SitioTuristico, { foreignKey: "sitio_id" });

// Usuario(turista) 1-N Itinerario
Usuario.hasMany(Itinerario, { foreignKey: "turista_id" });
Itinerario.belongsTo(Usuario, { foreignKey: "turista_id" });

// Itinerario 1-N ItinerarioItem
Itinerario.hasMany(ItinerarioItem, { foreignKey: "itinerario_id", as: "items" });
ItinerarioItem.belongsTo(Itinerario, { foreignKey: "itinerario_id" });

// SitioTuristico 1-N ItinerarioItem
SitioTuristico.hasMany(ItinerarioItem, { foreignKey: "sitio_id" });
ItinerarioItem.belongsTo(SitioTuristico, { foreignKey: "sitio_id", as: "sitio" });

// Usuario(turista) 1-N Reserva / SitioTuristico 1-N Reserva / Prestador 1-N Reserva
Usuario.hasMany(Reserva, { foreignKey: "turista_id" });
Reserva.belongsTo(Usuario, { foreignKey: "turista_id", as: "turista" });
SitioTuristico.hasMany(Reserva, { foreignKey: "sitio_id" });
Reserva.belongsTo(SitioTuristico, { foreignKey: "sitio_id", as: "sitio" });
Prestador.hasMany(Reserva, { foreignKey: "prestador_id" });
Reserva.belongsTo(Prestador, { foreignKey: "prestador_id", as: "prestador" });

// Usuario 1-N Notificacion
Usuario.hasMany(Notificacion, { foreignKey: "usuario_id" });
Notificacion.belongsTo(Usuario, { foreignKey: "usuario_id" });

// Usuario 1-N PasswordReset
Usuario.hasMany(PasswordReset, { foreignKey: "usuario_id" });
PasswordReset.belongsTo(Usuario, { foreignKey: "usuario_id" });

// Reseñas: una por reserva cumplida
SitioTuristico.hasMany(Resena, { foreignKey: "sitio_id", as: "resenas" });
Resena.belongsTo(SitioTuristico, { foreignKey: "sitio_id" });
Usuario.hasMany(Resena, { foreignKey: "turista_id" });
Resena.belongsTo(Usuario, { foreignKey: "turista_id", as: "turista" });
Reserva.hasOne(Resena, { foreignKey: "reserva_id", as: "resena" });
Resena.belongsTo(Reserva, { foreignKey: "reserva_id" });

// Favoritos: usuario <-> sitio
Usuario.hasMany(Favorito, { foreignKey: "usuario_id" });
SitioTuristico.hasMany(Favorito, { foreignKey: "sitio_id" });
Favorito.belongsTo(SitioTuristico, { foreignKey: "sitio_id", as: "sitio" });

// Fechas en las que el prestador no atiende un servicio
SitioTuristico.hasMany(FechaBloqueada, { foreignKey: "sitio_id", as: "fechas_bloqueadas" });
FechaBloqueada.belongsTo(SitioTuristico, { foreignKey: "sitio_id" });

// Paquetes: servicios de un mismo prestador vendidos juntos
Prestador.hasMany(Paquete, { foreignKey: "prestador_id" });
Paquete.belongsTo(Prestador, { foreignKey: "prestador_id" });
Paquete.hasMany(PaqueteItem, { foreignKey: "paquete_id", as: "items" });
PaqueteItem.belongsTo(Paquete, { foreignKey: "paquete_id" });
SitioTuristico.hasMany(PaqueteItem, { foreignKey: "sitio_id", as: "en_paquetes" });
PaqueteItem.belongsTo(SitioTuristico, { foreignKey: "sitio_id", as: "sitio" });
Paquete.hasMany(Reserva, { foreignKey: "paquete_id" });
Reserva.belongsTo(Paquete, { foreignKey: "paquete_id", as: "paquete" });

// Galería propia del paquete
Paquete.hasMany(ImagenPaquete, { foreignKey: "paquete_id", as: "imagenes" });
ImagenPaquete.belongsTo(Paquete, { foreignKey: "paquete_id" });

// Tarifas por temporada de un servicio
SitioTuristico.hasMany(TarifaTemporada, { foreignKey: "sitio_id", as: "tarifas" });
TarifaTemporada.belongsTo(SitioTuristico, { foreignKey: "sitio_id" });

// Verificación de correo
Usuario.hasMany(CodigoVerificacion, { foreignKey: "usuario_id" });
CodigoVerificacion.belongsTo(Usuario, { foreignKey: "usuario_id" });

// Historial de acciones del administrador
Auditoria.belongsTo(Usuario, { foreignKey: "actor_id", as: "actor" });

// Reseñas de paquetes
Paquete.hasMany(Resena, { foreignKey: "paquete_id", as: "resenas" });
Resena.belongsTo(Paquete, { foreignKey: "paquete_id" });

// Mensajería: una conversación por pareja (turista, negocio), con mensajes, fotos privadas y reportes
Usuario.hasMany(Conversacion, { foreignKey: "turista_id", as: "conversaciones" });
Conversacion.belongsTo(Usuario, { foreignKey: "turista_id", as: "turista" });
Prestador.hasMany(Conversacion, { foreignKey: "prestador_id", as: "conversaciones" });
Conversacion.belongsTo(Prestador, { foreignKey: "prestador_id", as: "negocio" });
Conversacion.hasMany(Mensaje, { foreignKey: "conversacion_id", as: "mensajes" });
Mensaje.belongsTo(Conversacion, { foreignKey: "conversacion_id", as: "conversacion" });
Mensaje.belongsTo(Usuario, { foreignKey: "autor_id", as: "autor" });
Mensaje.belongsTo(SitioTuristico, { foreignKey: "sitio_id", as: "sitio" });
Mensaje.belongsTo(Paquete, { foreignKey: "paquete_id", as: "paquete" });
Mensaje.hasMany(MensajeImagen, { foreignKey: "mensaje_id", as: "imagenes" });
MensajeImagen.belongsTo(Mensaje, { foreignKey: "mensaje_id", as: "mensaje" });
Mensaje.hasMany(ReporteMensaje, { foreignKey: "mensaje_id", as: "reportes" });
ReporteMensaje.belongsTo(Mensaje, { foreignKey: "mensaje_id", as: "mensaje" });
ReporteMensaje.belongsTo(Usuario, { foreignKey: "reportado_por", as: "reportador" });

// Casos de soporte sobre una reserva
Reserva.hasMany(CasoSoporte, { foreignKey: "reserva_id", as: "casos" });
CasoSoporte.belongsTo(Reserva, { foreignKey: "reserva_id", as: "reserva" });
CasoSoporte.belongsTo(Usuario, { foreignKey: "abierto_por", as: "autor" });

module.exports = { sequelize, Usuario, Prestador, SitioTuristico, ImagenSitio, Itinerario, ItinerarioItem, Reserva, Notificacion, PasswordReset, Resena, Favorito, FechaBloqueada, Paquete, PaqueteItem, ImagenPaquete, CodigoVerificacion, TarifaTemporada, Auditoria, Conversacion, Mensaje, MensajeImagen, ReporteMensaje, CasoSoporte, Invitacion };
