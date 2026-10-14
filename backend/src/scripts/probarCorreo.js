// Prueba de verdad el envío de correo con las credenciales de .env. A diferencia de la aplicación (donde un fallo de correo nunca rompe la
// operación y por eso pasa desapercibido), aquí SÍ se muestra el error.
//
// Uso:  npm run probar:correo                      → solo comprueba que Gmail acepta las credenciales
//       npm run probar:correo -- alguien@correo.com → además envía un correo de prueba a esa dirección
// Dentro de Docker: docker compose exec backend node src/scripts/probarCorreo.js alguien@correo.com
require("dotenv").config();
const { correoConfigurado, crearTransportador } = require("../services/emailService");

async function probar() {
  if (!correoConfigurado()) {
    console.error("✖ Faltan EMAIL_USER y EMAIL_PASS. Complétalos en el .env (nunca en el chat ni en el repositorio) y vuelve a intentarlo.");
    return 1;
  }
  const transportador = crearTransportador();

  try {
    await transportador.verify();
    console.log(`✔ Gmail aceptó las credenciales de ${process.env.EMAIL_USER}.`);
  } catch (err) {
    console.error(`✖ Gmail rechazó las credenciales: ${err.responseCode || err.code || ""} ${String(err.message).split("\n")[0]}`);
    console.error("  Revisa que EMAIL_PASS sea una «contraseña de aplicación» de 16 letras (no la clave de la cuenta) y que la verificación en dos pasos esté activa.");
    return 1;
  }

  const destino = process.argv[2];
  if (!destino) {
    console.log("  (Para enviar un correo de prueba: npm run probar:correo -- tucorreo@ejemplo.com)");
    return 0;
  }
  try {
    const info = await transportador.sendMail({
      from: `"PubliTours Caquetá Vive IA" <${process.env.EMAIL_USER}>`,
      to: destino,
      subject: "Prueba de correo de PubliTours",
      text: "Si lees esto, PubliTours puede enviar correos (verificación de correo, recuperación de contraseña y avisos de reservas).",
    });
    const aceptado = (info.accepted || []).includes(destino);
    console.log(aceptado ? `✔ Correo de prueba enviado a ${destino}. Revisa su bandeja de entrada (y la de spam).` : `✖ Gmail no aceptó el destinatario ${destino}.`);
    return aceptado ? 0 : 1;
  } catch (err) {
    console.error(`✖ No se pudo enviar el correo: ${err.responseCode || err.code || ""} ${String(err.message).split("\n")[0]}`);
    return 1;
  }
}

probar().then((codigo) => process.exit(codigo));
