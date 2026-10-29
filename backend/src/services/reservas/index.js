// Servicio de reservas, repartido por responsabilidad:
//  - gestion:     solicitar, confirmar, rechazar, cancelar y modificar (antes del servicio)
//  - seguimiento: recordatorios (antes del servicio y para calificar), asistencia y cierre automático
//  - consultas:   listados, comprobante y verificación pública
//  - comun / notificaciones: validaciones y avisos compartidos
module.exports = {
  ...require("./gestion"),
  ...require("./seguimiento"),
  ...require("./consultas"),
};
