// Estrellas de solo lectura (valor decimal) y selector interactivo (1 a 5).
export function Estrellas({ valor = 0, tamano = 18, className = "" }) {
  return (
    <span className={`inline-flex items-center ${className}`} aria-label={`${valor} de 5`}>
      {[1, 2, 3, 4, 5].map((n) => {
        const icono = valor >= n - 0.25 ? "star" : valor >= n - 0.75 ? "star_half" : "star";
        const activa = valor >= n - 0.75;
        return (
          <span
            key={n}
            className={`material-symbols-outlined ${activa ? "text-tertiary-container" : "text-outline-variant"}`}
            style={{ fontSize: tamano, fontVariationSettings: `'FILL' ${activa ? 1 : 0}` }}
          >
            {icono}
          </span>
        );
      })}
    </span>
  );
}

export function SelectorEstrellas({ valor, onChange }) {
  return (
    <div className="inline-flex items-center gap-1" role="radiogroup" aria-label="Calificación">
      {[1, 2, 3, 4, 5].map((n) => (
        <button
          key={n}
          type="button"
          role="radio"
          aria-checked={valor === n}
          aria-label={`${n} estrellas`}
          onClick={() => onChange(n)}
          className="p-0.5"
        >
          <span
            className={`material-symbols-outlined text-[34px] transition-colors ${n <= valor ? "text-tertiary-container" : "text-outline-variant hover:text-tertiary-fixed-dim"}`}
            style={{ fontVariationSettings: `'FILL' ${n <= valor ? 1 : 0}` }}
          >
            star
          </span>
        </button>
      ))}
    </div>
  );
}
