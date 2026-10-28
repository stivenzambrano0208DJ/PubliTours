// Campo de los formularios de acceso: etiqueta, ícono a la izquierda y el control (input, y a veces un botón) como contenido.
// `derecha` pone algo al otro lado de la etiqueta (por ejemplo, «¿Olvidaste tu contraseña?»).
export default function CampoAuth({ id, etiqueta, icono, derecha, children }) {
  const rotulo = <label className={`block font-label-md text-label-md text-on-surface${derecha ? "" : " mb-1.5"}`} htmlFor={id}>{etiqueta}</label>;
  return (
    <div>
      {derecha ? <div className="flex items-center justify-between mb-1.5">{rotulo}{derecha}</div> : rotulo}
      <div className="relative flex items-center">
        <span className="material-symbols-outlined absolute left-3.5 text-outline text-[20px] pointer-events-none" aria-hidden="true">{icono}</span>
        {children}
      </div>
    </div>
  );
}
