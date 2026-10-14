const BOTON_FLECHA = "w-10 h-10 rounded-xl bg-surface text-outline hover:text-on-surface flex items-center justify-center transition-colors disabled:opacity-40";

// Navegación entre páginas de resultados.
export default function Paginacion({ pagina, total, onIr }) {
  return (
    <div className="mt-space-xl pt-space-md flex flex-col sm:flex-row items-center justify-between gap-space-md bg-surface-container-lowest p-space-md rounded-2xl shadow-sm">
      <div className="flex items-center gap-2 font-body-sm text-body-sm text-on-surface-variant">
        <span>Página <strong className="text-on-surface">{pagina}</strong> de <strong className="text-on-surface">{total}</strong></span>
      </div>
      <div className="flex items-center gap-1">
        <button disabled={pagina <= 1} onClick={() => onIr(pagina - 1)} className={BOTON_FLECHA}>
          <span className="material-symbols-outlined text-[20px]">chevron_left</span>
        </button>
        {Array.from({ length: total }, (_, i) => i + 1).map((p) => (
          <button
            key={p}
            onClick={() => onIr(p)}
            className={`w-10 h-10 rounded-xl font-title-sm text-title-sm flex items-center justify-center transition-colors ${
              p === pagina ? "bg-primary text-on-primary shadow-sm" : "bg-surface text-on-surface hover:bg-surface-container"
            }`}
          >
            {p}
          </button>
        ))}
        <button disabled={pagina >= total} onClick={() => onIr(pagina + 1)} className={BOTON_FLECHA}>
          <span className="material-symbols-outlined text-[20px]">chevron_right</span>
        </button>
      </div>
    </div>
  );
}
