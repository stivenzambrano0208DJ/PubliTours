import { useIdioma } from "../context/idioma";
// Estrellas de solo lectura (valor decimal) y selector interactivo (1 a 5).
export function Estrellas({ valor = 0, tamano = 18, className = "" }) {
  const { t } = useIdioma();
  return (
    <span className={`inline-flex items-center ${className}`} aria-label={t("{valor} de 5", { valor })}>
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
  const { t } = useIdioma();
  return (
    <div className="inline-flex items-center gap-1" role="radiogroup" aria-label={t("Calificación")}>
      {[1, 2, 3, 4, 5].map((n) => (
        <button
          key={n}
          type="button"
          role="radio"
          aria-checked={valor === n}
          aria-label={(n === 1 ? t("1 estrella", { n }) : t("{n} estrellas", { n }))}
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
