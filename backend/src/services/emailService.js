const nodemailer = require("nodemailer");
const logger = require("../utils/logger");

function correoConfigurado() {
  return Boolean(process.env.EMAIL_USER && process.env.EMAIL_PASS);
}

function crearTransportador() {
  return nodemailer.createTransport({
    service: "gmail",
    auth: { user: process.env.EMAIL_USER, pass: process.env.EMAIL_PASS },
  });
}

const escapar = (t) => String(t ?? "").replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));

// RF: envía el código real de restablecimiento de contraseña (6 dígitos, expira en 15 minutos).
// Si no hay credenciales SMTP configuradas (.env), cae a modo desarrollo: registra el código en consola
// en vez de fallar, para poder seguir probando el flujo completo sin bloquear el resto del sistema.
async function enviarCorreoRecuperacion({ destinatario, nombre, codigo }) {
  if (!correoConfigurado()) {
    console.log("\n[emailService] EMAIL_USER/EMAIL_PASS no configurados en .env — modo desarrollo.");
    console.log(`[emailService] Código de restablecimiento para ${destinatario}: ${codigo}\n`);
    return { modo: "desarrollo" };
  }

  const transportador = crearTransportador();
  await transportador.sendMail({
    from: `"PubliTours Caquetá Vive IA" <${process.env.EMAIL_USER}>`,
    to: destinatario,
    subject: "Tu código para restablecer tu contraseña de PubliTours",
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 480px; margin: 0 auto; color: #131b2e;">
        <h2 style="color: #064e3b;">Restablece tu contraseña</h2>
        <p>Hola ${escapar(nombre)},</p>
        <p>Recibimos una solicitud para restablecer la contraseña de tu cuenta en PubliTours Caquetá Vive IA. Ingresa este código en la página de restablecimiento:</p>
        <p style="text-align: center; margin: 32px 0;">
          <span style="display: inline-block; background: #064e3b; color: #ffffff; padding: 16px 32px; border-radius: 12px; font-size: 32px; font-weight: 700; letter-spacing: 8px;">
            ${codigo}
          </span>
        </p>
        <p>Este código expira en 15 minutos. Si no solicitaste este cambio, puedes ignorar este correo.</p>
        <p style="color: #707974; font-size: 12px; margin-top: 32px;">PubliTours — Caquetá Vive IA</p>
      </div>
    `,
  });
  return { modo: "enviado" };
}

// Código de 6 dígitos para confirmar el correo. Sin SMTP configurado, en desarrollo se muestra en consola.
async function enviarCodigoVerificacion({ destinatario, nombre, codigo }) {
  if (!correoConfigurado()) {
    if (process.env.NODE_ENV !== "test") {
      console.log(`\n[emailService] (modo desarrollo) Código de verificación para ${destinatario}: ${codigo}\n`);
    }
    return { modo: "desarrollo" };
  }
  return enviarCorreo({
    destinatario,
    asunto: "Verifica tu correo en PubliTours",
    titulo: "Confirma tu correo",
    lineas: [
      `Hola ${nombre || ""},`,
      "Para activar todas las funciones de tu cuenta, ingresa este código de verificación en PubliTours:",
      codigo,
      "El código vence en 24 horas. Si no creaste una cuenta, ignora este mensaje.",
    ],
  });
}

// Correo transaccional genérico (reservas, reseñas…). Nunca lanza: un fallo de correo no debe romper la operación.
async function enviarCorreo({ destinatario, asunto, titulo, lineas = [], enlace = null }) {
  try {
    if (!correoConfigurado()) {
      if (process.env.NODE_ENV !== "test") {
        console.log(`[emailService] (modo desarrollo) Correo a ${destinatario}: ${asunto}`);
      }
      return { modo: "desarrollo" };
    }
    const url = enlace ? `${process.env.FRONTEND_URL || "http://localhost:5173"}${enlace.ruta}` : null;
    await crearTransportador().sendMail({
      from: `"PubliTours Caquetá Vive IA" <${process.env.EMAIL_USER}>`,
      to: destinatario,
      subject: asunto,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 520px; margin: 0 auto; color: #131b2e;">
          <h2 style="color: #064e3b;">${escapar(titulo)}</h2>
          ${lineas.map((l) => `<p>${escapar(l)}</p>`).join("")}
          ${url ? `<p style="margin: 28px 0;"><a href="${url}" style="background: #064e3b; color: #ffffff; padding: 12px 24px; border-radius: 10px; text-decoration: none; font-weight: 700;">${escapar(enlace.texto)}</a></p>` : ""}
          <p style="color: #707974; font-size: 12px; margin-top: 32px;">PubliTours — Caquetá Vive IA</p>
        </div>
      `,
    });
    return { modo: "enviado" };
  } catch (err) {
    logger.error("No se pudo enviar el correo", err);
    return { modo: "error" };
  }
}

module.exports = { enviarCodigoVerificacion, enviarCorreoRecuperacion, enviarCorreo, correoConfigurado, crearTransportador };
