import { Link } from "react-router-dom";
import { useConfiguracion } from "../hooks/useConfiguracion";
import { NOMBRES_POLITICA, textoDias } from "../utils/politicas";

// Preguntas frecuentes. Todo lo que afirma coincide con lo que hace la plataforma; las cifras (plazos de cancelación, días de gracia,
// comisión) se leen de la configuración del servidor para que nunca se contradigan con las reglas reales.
function secciones(config) {
  const politicas = config?.politicas_cancelacion;
  const plazos = politicas
    ? Object.entries(politicas).map(([nombre, dias]) => `${NOMBRES_POLITICA[nombre] || nombre}: gratis hasta ${textoDias(dias)} antes`).join("; ")
    : null;

  return [
    {
      titulo: "Si eres turista",
      icono: "luggage",
      preguntas: [
        {
          p: "¿Cómo reservo un servicio o un paquete?",
          r: <>Abre un servicio desde <Link to="/explorar">Explorar destinos</Link> o un paquete desde <Link to="/paquetes">Paquetes</Link>, elige la fecha y el número de personas y envía la solicitud. Necesitas una cuenta con el correo verificado: al registrarte te enviamos un código de 6 dígitos.</>,
        },
        {
          p: "¿Mi reserva queda confirmada al instante?",
          r: "No. Queda como «pendiente» hasta que el prestador la confirme o la rechace. Te avisamos con una notificación cuando responda. Si la rechaza, verás el motivo que escribió.",
        },
        {
          p: "¿Cómo y cuándo pago?",
          r: "PubliTours no procesa pagos. La forma y el momento de pago los acuerdas directamente con el prestador. El valor que ves al reservar es el calculado con las tarifas publicadas del servicio.",
        },
        {
          p: "¿Puedo cancelar o cambiar la fecha?",
          r: <>Sí, mientras la reserva esté pendiente o confirmada y la fecha no haya llegado: usa «Cancelar reserva» o «Modificar reserva» en <Link to="/mis-reservas">Mis Reservas</Link>. Cada servicio tiene una política de cancelación que ves antes de reservar{plazos ? ` (${plazos})` : ""}. Cancelar con menos antelación se registra como cancelación tardía y el prestador lo ve.</>,
        },
        {
          p: "¿Qué es el código del comprobante?",
          r: "Cuando el prestador confirma, tu reserva recibe un código (por ejemplo PT-AB12CD) y un QR. Preséntalo al llegar: cualquiera puede comprobar en la plataforma que la reserva es real. También puedes añadir la fecha a tu calendario desde la tarjeta de la reserva.",
        },
        {
          p: "¿Cuándo puedo dejar una reseña?",
          r: `Después del servicio, cuando la reserva queda «completada»: el prestador registra que asististe${config?.dias_gracia_asistencia ? `, o la reserva se completa sola a los ${config.dias_gracia_asistencia} días si no lo hace` : ""}. Solo se puede reseñar una reserva completada, una vez.`,
        },
        {
          p: "¿Puedo preguntarle algo al negocio antes de reservar?",
          r: <>Sí. En la página de cada servicio y de cada paquete hay un botón «Preguntar al negocio»: escribes tu pregunta (puedes adjuntar {config?.mensajeria?.fotos_max ? `hasta ${config.mensajeria.fotos_max} fotos` : "fotos"}) y el negocio te responde dentro de PubliTours. Ves las respuestas en <Link to="/mensajes">Mensajes</Link>, donde un contador te avisa de lo que no has leído. Necesitas una cuenta con el correo verificado. El negocio solo puede responder a quien le escribió, y si un mensaje te incomoda puedes reportarlo.</>,
        },
        {
          p: "¿Cómo funciona el itinerario con IA?",
          r: <>En <Link to="/itinerario">Itinerario IA</Link> cuentas tu viaje con tus palabras; la IA solo interpreta tu mensaje (presupuesto, días, intereses) y tú revisas los datos. El plan se arma con servicios reales del catálogo verificado, nunca con lugares inventados. Sin la IA disponible, se usa una interpretación básica por reglas.</>,
        },
      ],
    },
    {
      titulo: "Si eres prestador",
      icono: "storefront",
      preguntas: [
        {
          p: "¿Cómo publico mi negocio?",
          r: "Regístrate como prestador, completa el perfil de tu negocio y envíalo a revisión. Un administrador lo verifica; cuando lo aprueba, tus servicios y paquetes se publican. Solo tú gestionas tu catálogo: el administrador verifica y modera, pero no lo edita.",
        },
        {
          p: "¿Cómo respondo a las preguntas de los clientes?",
          r: <>Las preguntas llegan a <Link to="/mensajes">Mensajes</Link>, con un aviso en la campana y por correo (el aviso no copia el mensaje). Tú solo respondes a quien te escribió: no puedes abrir conversaciones con turistas. Las fotos que te envían son privadas. Si un mensaje es spam, ofensivo o sospechoso, repórtalo y la administración lo revisa.</>,
        },
        {
          p: "¿Cómo gestiono mis reservas?",
          r: "En tu portal ves las solicitudes: puedes confirmar o rechazar (explicando el motivo). Para evitar que se llene de más, la confirmación revisa el cupo en ese momento. Bloquea desde tu calendario los días en que no atiendes.",
        },
        {
          p: "¿Qué pasa después del servicio?",
          r: `Registra si el turista asistió. «Asistió» completa la reserva y permite la reseña; «No asistió» no genera comisión ni reseña.${config?.dias_gracia_asistencia ? ` Si no lo registras en ${config.dias_gracia_asistencia} días, la reserva se completa sola.` : ""}`,
        },
        {
          p: "¿Hay comisión?",
          r: config?.comision_pct != null
            ? `El modelo prevé una comisión del ${config.comision_pct} % sobre las reservas aceptadas. Hoy es solo una estimación que ves en tu panel: no se cobra. Si en el futuro se empieza a cobrar, se avisará con anticipación.`
            : "El modelo prevé una comisión sobre las reservas aceptadas. Hoy es solo una estimación: no se cobra.",
        },
      ],
    },
    {
      titulo: "Tu cuenta y tus datos",
      icono: "manage_accounts",
      preguntas: [
        {
          p: "Olvidé mi contraseña",
          r: <>En <Link to="/olvide-password">recuperar contraseña</Link> escribe tu correo y te enviamos un código de 6 dígitos. Al cambiar la contraseña se cierran tus otras sesiones abiertas.</>,
        },
        {
          p: "¿Puedo descargar o borrar mis datos?",
          r: <>Sí, desde tu <Link to="/perfil">perfil</Link>: puedes descargar tus datos (incluidas tus conversaciones) y eliminar tu cuenta, lo que borra también tus mensajes y sus fotos. Más detalles en la <Link to="/privacidad">política de privacidad</Link> (Ley 1581 de 2012).</>,
        },
        {
          p: "¿Algo salió mal con un prestador?",
          r: <>PubliTours es un intermediario: el servicio lo presta y lo responde cada prestador. Revisa los <Link to="/terminos">términos y condiciones</Link> y, para un conflicto, comunícate primero con el negocio.</>,
        },
      ],
    },
  ];
}

export default function Ayuda() {
  const config = useConfiguracion();
  return (
    <div className="max-w-3xl mx-auto px-gutter py-space-xl">
      <header className="text-center mb-space-lg">
        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-secondary-container/40 text-secondary font-label-xs text-label-xs font-semibold mb-3">
          <span className="material-symbols-outlined text-[14px]" aria-hidden="true">help</span>
          Ayuda
        </span>
        <h1 className="font-headline-xl text-headline-xl text-primary tracking-tight">Preguntas frecuentes</h1>
        <p className="font-body-md text-body-md text-on-surface-variant mt-2">Lo básico para reservar, ofrecer tus servicios y cuidar tu cuenta.</p>
      </header>

      <div className="flex flex-col gap-space-lg">
        {secciones(config).map((s) => (
          <section key={s.titulo} aria-labelledby={`ayuda-${s.icono}`}>
            <h2 id={`ayuda-${s.icono}`} className="flex items-center gap-2 font-title-lg text-title-lg text-on-surface font-semibold mb-3">
              <span className="material-symbols-outlined text-secondary" aria-hidden="true">{s.icono}</span>
              {s.titulo}
            </h2>
            <div className="flex flex-col gap-2">
              {s.preguntas.map((q) => (
                <details key={q.p} className="group rounded-2xl bg-surface-container-lowest shadow-sm open:shadow-md">
                  <summary className="flex items-center justify-between gap-3 cursor-pointer list-none px-4 py-3 font-label-md text-label-md font-semibold text-on-surface rounded-2xl focus:outline-none focus-visible:ring-2 focus-visible:ring-secondary">
                    {q.p}
                    <span className="material-symbols-outlined text-outline transition-transform group-open:rotate-180" aria-hidden="true">expand_more</span>
                  </summary>
                  <div className="px-4 pb-4 font-body-md text-body-md text-on-surface-variant [&_a]:text-secondary [&_a]:font-semibold [&_a]:underline">{q.r}</div>
                </details>
              ))}
            </div>
          </section>
        ))}
      </div>
    </div>
  );
}
