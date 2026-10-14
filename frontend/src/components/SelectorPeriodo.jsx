const CAMPO = "px-3 py-2 rounded-xl bg-surface-container-low border border-surface-container-high outline-none focus:border-secondary";

// Dos fechas (desde / hasta) para elegir el periodo de un reporte.
export default function SelectorPeriodo({ periodo, onCambio }) {
  return (
    <>
      <label className="flex flex-col gap-1">
        <span className="font-label-xs text-label-xs text-on-surface-variant">Desde</span>
        <input type="date" className={CAMPO} value={periodo.desde} max={periodo.hasta || undefined} onChange={(e) => onCambio({ ...periodo, desde: e.target.value })} />
      </label>
      <label className="flex flex-col gap-1">
        <span className="font-label-xs text-label-xs text-on-surface-variant">Hasta</span>
        <input type="date" className={CAMPO} value={periodo.hasta} min={periodo.desde || undefined} onChange={(e) => onCambio({ ...periodo, hasta: e.target.value })} />
      </label>
    </>
  );
}
