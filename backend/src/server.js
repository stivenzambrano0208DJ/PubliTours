require("dotenv").config();
const { validarEntorno } = require("./config/entorno");
const logger = require("./utils/logger");

const problemas = validarEntorno();
if (problemas.length > 0) {
  console.error("Configuración inválida:\n" + problemas.map((p) => `  - ${p}`).join("\n"));
  process.exit(1);
}

const app = require("./app");
const { sequelize } = require("./models");
const { cerrarReservasVencidas, enviarRecordatorios, recordarCalificar } = require("./services/reservas");

const PORT = process.env.PORT || 4000;

async function iniciar() {
  try {
    await sequelize.authenticate();
    // El esquema se gestiona con migraciones: npm run migrate
    logger.info("Conexión a la base de datos establecida.");

    // Tareas programadas (al iniciar y cada hora): cierre de reservas vencidas, recordatorio previo al servicio y recordatorio para calificar.
    const tarea = () => {
      cerrarReservasVencidas().catch((e) => logger.error("Error al cerrar reservas vencidas", e));
      enviarRecordatorios().catch((e) => logger.error("Error al enviar recordatorios", e));
      recordarCalificar().catch((e) => logger.error("Error al recordar calificaciones", e));
    };
    tarea();
    const temporizador = setInterval(tarea, 60 * 60 * 1000);

    const servidor = app.listen(PORT, () => logger.info(`PubliTours API escuchando en el puerto ${PORT}`));

    // Cierre ordenado (docker stop, despliegues): deja de aceptar peticiones, termina las que están en curso y cierra la base de datos.
    let cerrando = false;
    const apagar = (senal) => {
      if (cerrando) return;
      cerrando = true;
      logger.info(`Recibida ${senal}: cerrando`);
      clearInterval(temporizador);
      const forzar = setTimeout(() => process.exit(1), 10_000).unref(); // si algo no termina, se fuerza
      servidor.close(async () => {
        await sequelize.close().catch(() => {});
        clearTimeout(forzar);
        process.exit(0);
      });
    };
    for (const senal of ["SIGINT", "SIGTERM"]) process.on(senal, () => apagar(senal));
  } catch (err) {
    logger.error("No se pudo iniciar el servidor", err);
    process.exit(1);
  }
}

process.on("unhandledRejection", (err) => logger.error("Promesa rechazada sin capturar", err));
iniciar();
