import { Link } from "react-router-dom";
import PaginaLegal, { Seccion } from "../components/PaginaLegal";
import { VERSION_TERMINOS } from "../constants";

const CONTACTO = import.meta.env.VITE_CONTACTO_EMAIL;

export default function Privacidad() {
  return (
    <PaginaLegal titulo="Política de Tratamiento de Datos Personales" version={VERSION_TERMINOS}>
      <p>
        Esta política aplica al tratamiento de datos personales en PubliTours — Caquetá Vive IA, conforme a la Ley 1581 de 2012, el Decreto 1377 de 2013 y las demás normas
        colombianas de protección de datos (<em>habeas data</em>).
      </p>

      <Seccion n="1" titulo="Responsable del tratamiento">
        <p>
          El equipo de PubliTours, proyecto de formación del programa Análisis y Desarrollo de Software del SENA, Regional Caquetá (Florencia, Caquetá, Colombia).
          {CONTACTO
            ? <> Para consultas o para ejercer tus derechos escríbenos a <a className="text-secondary font-semibold hover:underline" href={`mailto:${CONTACTO}`}>{CONTACTO}</a>.</>
            : " Para consultas o para ejercer tus derechos usa el canal de contacto que la administración de la plataforma publique."}
        </p>
      </Seccion>

      <Seccion n="2" titulo="Qué datos recogemos">
        <ul>
          <li><strong>Cuenta:</strong> nombre, correo electrónico y contraseña (guardada cifrada, nunca en texto legible), tipo de cuenta, fecha de registro y de aceptación de los términos.</li>
          <li><strong>Prestadores:</strong> nombre, categoría, municipio, descripción, WhatsApp, dirección y redes de su negocio, y las fotos y datos de sus servicios y paquetes. Parte de esta información es pública.</li>
          <li><strong>Actividad:</strong> reservas (fechas, personas, notas), reseñas, favoritos, itinerarios y notificaciones.</li>
          <li><strong>Mensajes:</strong> el texto y las fotos que envías en tus conversaciones con negocios (o que recibes de clientes si tienes un negocio), con su fecha. Solo los ven las dos personas de la conversación; la administración ve únicamente un mensaje concreto (y sus fotos) cuando alguien lo reporta. Las fotos no tienen una dirección pública: solo se entregan a quien participa en la conversación. Se eliminan junto con tu cuenta.</li>
          <li><strong>Ubicación:</strong> solo si pulsas “Más cercanos a mí” o “Usar mi ubicación actual”, tu navegador te pide permiso. La usamos en el momento para calcular distancias o colocar un punto en el mapa y <strong>no la guardamos</strong> asociada a tu cuenta.</li>
          <li><strong>Técnicos:</strong> al iniciar sesión guardamos una <strong>cookie de sesión</strong> (necesaria para que la plataforma te reconozca; el navegador no permite que ningún script de la página la lea) y tu navegador recuerda localmente que tienes una sesión abierta y la capa de mapa preferida. No usamos cookies de publicidad ni de seguimiento.</li>
        </ul>
      </Seccion>

      <Seccion n="3" titulo="Para qué los usamos">
        <ul>
          <li>Crear y proteger tu cuenta, verificar tu correo y recuperar tu contraseña.</li>
          <li>Gestionar reservas entre turistas y prestadores y enviarte avisos sobre ellas.</li>
          <li>Mostrar reseñas, perfiles de negocios y recomendaciones de itinerarios.</li>
          <li>Permitir que turistas y negocios se escriban, y avisarte cuando tienes un mensaje nuevo (el aviso no copia el contenido del mensaje).</li>
          <li>Moderar el contenido, prevenir abusos y mantener la seguridad de la plataforma.</li>
        </ul>
        <p>No vendemos tus datos ni los usamos para publicidad de terceros.</p>
      </Seccion>

      <Seccion n="4" titulo="Con quién se comparten">
        <ul>
          <li><strong>El prestador y el turista</strong> de una reserva ven los datos necesarios para atenderla (nombre, fecha, personas y nota; el prestador también un WhatsApp público para contactarlo).</li>
          <li><strong>Proveedor de correo</strong> (para enviar códigos y avisos).</li>
          <li><strong>Servicios de mapas</strong> (OpenStreetMap y Esri): al ver un mapa, tu navegador les solicita las imágenes y pueden recibir tu dirección IP.</li>
          <li><strong>Inteligencia artificial</strong> (Anthropic, solo si la administración la activó): el texto que escribes en “Cuéntanos tu viaje” se envía para interpretarlo. No incluyas datos sensibles ahí.</li>
          <li>Autoridades, cuando la ley lo exija.</li>
        </ul>
      </Seccion>

      <Seccion n="5" titulo="Tus derechos como titular">
        <p>Puedes conocer, actualizar y rectificar tus datos; pedir prueba de la autorización que diste; ser informado del uso que les damos; revocar la autorización y solicitar la supresión de tus datos cuando no exista un deber legal o contractual de conservarlos; y acceder a ellos de forma gratuita.</p>
        <p>Parte de esto puedes hacerlo tú mismo en <Link to="/perfil" className="text-secondary font-semibold hover:underline">Mi perfil → Mis datos</Link> (nombre, correo y contraseña). Para lo demás, usa el canal de contacto. Si consideras que se vulneraron tus derechos, puedes presentar una queja ante la Superintendencia de Industria y Comercio (SIC).</p>
      </Seccion>

      <Seccion n="6" titulo="Autorización y datos de menores">
        <p>Al registrarte aceptas esta política; guardamos la fecha y la versión que aceptaste. El servicio está dirigido a mayores de 18 años y no recogemos a propósito datos de menores.</p>
      </Seccion>

      <Seccion n="7" titulo="Seguridad y conservación">
        <p>
          Cifrado de contraseñas, conexión segura en producción, códigos de un solo uso con límite de intentos y acceso por roles. Conservamos los datos mientras tengas la
          cuenta y el tiempo que la ley exija por el historial de reservas; luego se eliminan o anonimizan.
        </p>
      </Seccion>

      <Seccion n="8" titulo="Cambios">
        <p>Si esta política cambia, publicaremos la nueva versión aquí y te pediremos aceptarla cuando corresponda. Más sobre el uso del sitio en los <Link to="/terminos" className="text-secondary font-semibold hover:underline">Términos y Condiciones</Link>.</p>
      </Seccion>
    </PaginaLegal>
  );
}
