import { CAMPO_ANCHO, CAMPO_COMPACTO } from "../../estilos";

// Campos de formulario de la plataforma: Campo (<input>), Selector (<select>) y AreaTexto (<textarea>) comparten forma, borde y foco
// (las clases están en estilos.js, la única fuente de verdad). Reciben los mismos atributos que el elemento nativo.
//  - tamano: "ancho" (ocupa todo el ancho de su columna, el de los formularios) o "compacto" (relleno menor, para barras y filtros).
const TAMANOS = { ancho: CAMPO_ANCHO, compacto: CAMPO_COMPACTO };
const clases = (tamano, className) => `${TAMANOS[tamano]} ${className}`.trim();

export default function Campo({ tamano = "ancho", className = "", ...props }) {
  return <input className={clases(tamano, className)} {...props} />;
}

export function Selector({ tamano = "ancho", className = "", ...props }) {
  return <select className={clases(tamano, className)} {...props} />;
}

export function AreaTexto({ tamano = "ancho", className = "", ...props }) {
  return <textarea className={clases(tamano, className)} {...props} />;
}
