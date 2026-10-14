import { fechaMinima } from "../../constants";

const INPUT = "px-3 py-2 rounded-xl bg-surface-container-low border border-surface-container-high outline-none focus:border-secondary w-full";
const VACIA = { nombre: "", fecha_desde: "", fecha_hasta: "", precio: "", precio_nino: "" };

// Tarifas flexibles de un servicio: precio de niños, descuento por grupo y temporadas con precio propio.
export default function PreciosAvanzados({ valor, onChange }) {
  const temporadas = valor.temporadas || [];
  const cambiarTemporada = (i, campo, v) => onChange({ temporadas: temporadas.map((t, j) => (j === i ? { ...t, [campo]: v } : t)) });

  return (
    <details className="rounded-xl border border-surface-container-high p-3 group" open={Boolean(valor.precio_nino || valor.grupo_min_personas || temporadas.length)}>
      <summary className="cursor-pointer font-label-md text-label-md text-on-surface font-semibold flex items-center gap-2 list-none">
        <span className="material-symbols-outlined text-secondary text-[20px]">sell</span>
        Precios flexibles <span className="font-normal text-on-surface-variant">(opcional)</span>
        <span className="material-symbols-outlined text-[18px] ml-auto transition-transform group-open:rotate-180">expand_more</span>
      </summary>

      <div className="mt-3 flex flex-col gap-4">
        <label className="flex flex-col gap-1.5">
          <span className="font-label-md text-label-md text-on-surface font-semibold">Precio para niños (COP)</span>
          <input type="number" min="0" className={INPUT} placeholder="Vacío = pagan lo mismo que un adulto" value={valor.precio_nino ?? ""} onChange={(e) => onChange({ precio_nino: e.target.value })} />
        </label>

        <div className="flex flex-col gap-1.5">
          <span className="font-label-md text-label-md text-on-surface font-semibold">Descuento por grupo</span>
          <div className="flex items-center gap-2 flex-wrap font-body-sm text-body-sm text-on-surface-variant">
            Desde
            <input type="number" min="2" aria-label="Desde cuántas personas" className={`${INPUT} !w-20`} placeholder="6" value={valor.grupo_min_personas ?? ""} onChange={(e) => onChange({ grupo_min_personas: e.target.value })} />
            personas,
            <input type="number" min="1" max="90" aria-label="Porcentaje de descuento" className={`${INPUT} !w-20`} placeholder="10" value={valor.grupo_descuento_pct ?? ""} onChange={(e) => onChange({ grupo_descuento_pct: e.target.value })} />
            % de descuento
          </div>
        </div>

        <div className="flex flex-col gap-2">
          <div className="flex items-center justify-between">
            <span className="font-label-md text-label-md text-on-surface font-semibold">Temporadas con precio propio</span>
            <button type="button" onClick={() => onChange({ temporadas: [...temporadas, { ...VACIA }] })} className="inline-flex items-center gap-1 font-label-xs text-label-xs text-secondary font-semibold hover:underline">
              <span className="material-symbols-outlined text-[16px]">add_circle</span> Agregar temporada
            </button>
          </div>
          {temporadas.length === 0 && <p className="font-label-xs text-label-xs text-on-surface-variant">Ej. Semana Santa, diciembre, puentes festivos. En esas fechas se cobra el precio de la temporada.</p>}
          {temporadas.map((t, i) => (
            <div key={i} className="grid grid-cols-2 gap-2 p-2.5 rounded-xl bg-surface-container-low">
              <input className={`${INPUT} col-span-2`} placeholder="Nombre (ej. Semana Santa)" aria-label="Nombre de la temporada" maxLength={80} value={t.nombre} onChange={(e) => cambiarTemporada(i, "nombre", e.target.value)} />
              <label className="font-label-xs text-label-xs text-on-surface-variant">Desde<input type="date" min={fechaMinima()} className={INPUT} value={t.fecha_desde} onChange={(e) => cambiarTemporada(i, "fecha_desde", e.target.value)} /></label>
              <label className="font-label-xs text-label-xs text-on-surface-variant">Hasta<input type="date" min={t.fecha_desde || fechaMinima()} className={INPUT} value={t.fecha_hasta} onChange={(e) => cambiarTemporada(i, "fecha_hasta", e.target.value)} /></label>
              <input type="number" min="0" className={INPUT} placeholder="Precio adulto" aria-label="Precio de adulto en la temporada" value={t.precio} onChange={(e) => cambiarTemporada(i, "precio", e.target.value)} />
              <input type="number" min="0" className={INPUT} placeholder="Precio niño (opc.)" aria-label="Precio de niño en la temporada" value={t.precio_nino ?? ""} onChange={(e) => cambiarTemporada(i, "precio_nino", e.target.value)} />
              <button type="button" onClick={() => onChange({ temporadas: temporadas.filter((_, j) => j !== i) })} className="col-span-2 justify-self-end inline-flex items-center gap-1 font-label-xs text-label-xs text-error font-semibold hover:underline">
                <span className="material-symbols-outlined text-[16px]">delete</span> Quitar temporada
              </button>
            </div>
          ))}
        </div>
      </div>
    </details>
  );
}
