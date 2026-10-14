import { Link } from "react-router-dom";
import PaginaLegal, { Seccion } from "../components/PaginaLegal";
import { VERSION_TERMINOS } from "../constants";
import Comision from "../components/Comision";

export default function Terminos() {
  return (
    <PaginaLegal titulo="Términos y Condiciones de uso" version={VERSION_TERMINOS}>
      <Seccion n="1" titulo="Qué es PubliTours">
        <p>
          PubliTours — Caquetá Vive IA es una plataforma web que conecta a turistas con prestadores de servicios turísticos del departamento del Caquetá
          (Colombia). PubliTours es un <strong>intermediario tecnológico</strong>: muestra la oferta, permite solicitar reservas y facilita la comunicación entre las partes.
          Los servicios los presta y los responde cada prestador; PubliTours no los presta ni los garantiza.
        </p>
        <p>La plataforma <strong>no procesa pagos</strong>. La forma y el momento de pago se acuerdan directamente entre el turista y el prestador.</p>
        <p>
          <strong>Comisión.</strong> El modelo de PubliTours prevé una comisión de <Comision /> sobre las reservas aceptadas. Hoy es solo una <strong>estimación</strong> que
          se muestra al prestador en su panel: no se cobra. Si en el futuro se empieza a cobrar, se avisará con anticipación y se pedirá aceptar los nuevos términos.
        </p>
      </Seccion>

      <Seccion n="2" titulo="Tu cuenta">
        <ul>
          <li>Debes ser mayor de 18 años y dar información verdadera y actualizada.</li>
          <li>Eres responsable de tu contraseña y de lo que ocurra desde tu cuenta. Avísanos si sospechas un uso no autorizado.</li>
          <li>Confirmamos tu correo con un código de verificación. Algunas acciones (reservar, calificar, enviar un negocio a revisión) requieren el correo verificado.</li>
          <li>Una persona puede ser turista o prestador, no ambas cosas con la misma cuenta.</li>
        </ul>
      </Seccion>

      <Seccion n="3" titulo="Prestadores de servicios">
        <ul>
          <li>Todo negocio es revisado por un administrador antes de publicar. La aprobación no implica una garantía de calidad de PubliTours.</li>
          <li>El prestador es responsable de la veracidad de su información (descripción, precios, horarios, ubicación, fotos, cupos) y de cumplir las normas que le apliquen, incluidas las de turismo y sanidad, y el Registro Nacional de Turismo cuando corresponda.</li>
          <li>Solo puede publicar servicios y paquetes propios y debe atender las reservas que confirme.</li>
          <li>El administrador puede ocultar contenido que incumpla estos términos; el prestador verá el motivo.</li>
        </ul>
      </Seccion>

      <Seccion n="4" titulo="Reservas">
        <ul>
          <li>Una reserva nace como <strong>solicitud pendiente</strong>. Solo queda confirmada cuando el prestador la acepta.</li>
          <li>El prestador puede rechazarla explicando el motivo. El turista puede cancelar una reserva pendiente o confirmada hasta el día anterior a la fecha del servicio.</li>
          <li>Cada servicio o paquete tiene una <strong>política de cancelación</strong> (flexible, moderada o estricta) que elige el prestador y que se muestra antes de reservar. Cancelar con menos antelación que la política se registra como cancelación tardía; hoy no tiene cargo y el reembolso, si lo hay, se acuerda entre las partes.</li>
          <li>Pasado el servicio, el prestador registra si el turista <strong>asistió</strong>. Si no lo hace en unos días, la reserva se completa sola. Una reserva marcada como «no asistió» no genera comisión ni permite reseña; si el turista cree que hubo un error, debe comunicarse con el negocio.</li>
          <li>Cada servicio o paquete tiene cupos y días no disponibles definidos por el prestador; la plataforma los aplica al reservar y al confirmar.</li>
          <li>Las condiciones de pago, reembolso o cambio de fecha se acuerdan entre las partes. PubliTours no interviene en ellas.</li>
        </ul>
      </Seccion>

      <Seccion n="5" titulo="Reseñas y contenido">
        <ul>
          <li>Solo pueden calificar quienes tuvieron una reserva cumplida. Las reseñas deben reflejar tu experiencia real.</li>
          <li>No se permite contenido ofensivo, discriminatorio, falso, engañoso o que infrinja derechos de terceros. PubliTours puede retirarlo.</li>
          <li>
            <strong>Mensajes.</strong> Un turista puede escribirle a un negocio, con texto y fotos, y el negocio responde: los negocios no inician conversaciones. Solo ven la conversación esas dos partes.
            No se permite el spam, el acoso, el contenido ofensivo, los engaños ni pedir datos personales o de pago de forma sospechosa. Cualquiera de las dos partes puede reportar un mensaje:
            la administración revisa solo ese mensaje y sus fotos, y puede retirarlo.
          </li>
          <li>Al publicar fotos y textos nos autorizas a mostrarlos en la plataforma; conservas la titularidad de lo que es tuyo.</li>
        </ul>
      </Seccion>

      <Seccion n="6" titulo="Uso aceptable">
        <p>Está prohibido suplantar a otras personas, intentar acceder a cuentas ajenas, extraer datos de forma masiva, alterar el funcionamiento del sitio o usarlo para fines ilegales.</p>
      </Seccion>

      <Seccion n="7" titulo="Suspensión de cuentas">
        <p>PubliTours puede suspender cuentas que incumplan estos términos o pongan en riesgo a otros usuarios. Una cuenta suspendida no puede iniciar sesión mientras dure la medida.</p>
      </Seccion>

      <Seccion n="8" titulo="Inteligencia artificial">
        <p>
          El asistente de itinerarios interpreta lo que escribes para rellenar un formulario. <strong>Los lugares recomendados siempre salen del catálogo de la plataforma</strong>,
          no los inventa la IA. Revisa los datos antes de reservar: la recomendación es una ayuda, no una garantía.
        </p>
      </Seccion>

      <Seccion n="9" titulo="Responsabilidad">
        <p>
          Como intermediario, PubliTours no responde por la prestación, calidad, seguridad o cumplimiento de los servicios ofrecidos por los prestadores, ni por acuerdos
          entre las partes. Hacemos nuestro mejor esfuerzo por mantener la plataforma disponible, pero no garantizamos que funcione sin interrupciones.
        </p>
      </Seccion>

      <Seccion n="10" titulo="Datos personales">
        <p>El tratamiento de tus datos se explica en la <Link to="/privacidad" className="text-secondary font-semibold hover:underline">Política de Privacidad</Link>.</p>
      </Seccion>

      <Seccion n="11" titulo="Cambios y ley aplicable">
        <p>
          Podemos actualizar estos términos; la versión vigente y su fecha aparecen en esta página, y guardamos qué versión aceptó cada usuario. Se rigen por las leyes de la
          República de Colombia.
        </p>
      </Seccion>
    </PaginaLegal>
  );
}
