// Mensaje de error de la plataforma. Es un aviso de alerta (role="alert"), así que el lector de pantalla lo anuncia al aparecer.
//  - forma: "texto" (línea de error bajo un formulario o una lista), "pequeno" (la misma, para espacios estrechos) y
//    "caja" (recuadro con fondo, para un fallo que ocupa su propio bloque).
const FORMAS = {
  texto: "font-body-sm text-body-sm text-error",
  pequeno: "font-label-xs text-label-xs text-error",
  caja: "p-3 rounded-xl bg-error-container text-on-error-container font-body-sm text-body-sm",
};

export default function Aviso({ forma = "texto", className = "", ...props }) {
  return <p role="alert" className={`${FORMAS[forma]} ${className}`.trim()} {...props} />;
}
