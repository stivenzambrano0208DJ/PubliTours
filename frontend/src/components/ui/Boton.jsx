// Botón de la plataforma: una sola definición de forma, tipografía y estados para las acciones principales, secundarias y de riesgo.
// El tamaño (relleno) y la posición dentro del diseño los pone quien lo usa con className; aquí solo está lo que debe ser igual en todas partes.
//  - variante: "primario" (acción principal), "secundario" (alternativa o cancelar), "peligro" (acción destructiva, p. ej. rechazar o eliminar).
// Como el <button> nativo, no fija type: quien lo usa en un formulario indica type="button" o type="submit".
const BASE = "rounded-xl font-label-md text-label-md transition-colors disabled:opacity-60";

const VARIANTES = {
  primario: "bg-primary text-on-primary hover:bg-primary-container",
  secundario: "bg-surface-container text-on-surface hover:bg-surface-container-high",
  peligro: "bg-error text-on-error hover:opacity-90",
};

export default function Boton({ variante = "primario", className = "", ...props }) {
  return <button className={`${BASE} ${VARIANTES[variante]} ${className}`.trim()} {...props} />;
}
