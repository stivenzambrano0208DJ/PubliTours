// Tarjeta de la plataforma: el contenedor claro con esquinas redondeadas y sombra suave que usan las secciones y los bloques de contenido.
// El relleno, la disposición y los estados (hover, desplazamiento…) los pone quien la usa con className.
//  - as: etiqueta que se dibuja ("div" por defecto; "section", "article" o "li" cuando la estructura de la página lo pide).
export default function Tarjeta({ as: Etiqueta = "div", className = "", ...props }) {
  return <Etiqueta className={`bg-surface-container-lowest rounded-2xl shadow-sm ${className}`.trim()} {...props} />;
}
