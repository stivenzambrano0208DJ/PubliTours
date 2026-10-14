// Servicio de reservas, repartido por responsabilidad:
//  - gestion:     solicitar, confirmar, rechazar, cancelar y modificar (antes del servicio)
//  - seguimiento: recordatorio, asistencia y cierre automático (alrededor del servicio)
//  - consultas:   listados, comprobante y verificación pública
//  - comun / notificaciones: validaciones y avisos compartidos
module.exports = {
  ...require("./gestion"),
  ...require("./seguimiento"),
  ...require("./consultas"),
};
