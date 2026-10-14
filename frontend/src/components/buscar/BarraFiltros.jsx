import { CATEGORIA_ICONOS, fechaMinima } from "../../constants";

const SELECT = "appearance-none pl-3 pr-8 py-2 rounded-xl bg-surface text-on-surface font-label-md text-label-md focus:outline-none focus:bg-surface-container cursor-pointer shadow-sm";
const FLECHA = "material-symbols-outlined absolute right-2 top-1/2 -translate-y-1/2 text-on-surface-variant pointer-events-none text-[18px]";

function Categoria({ activa, onClick, children }) {
  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-2 px-4 py-2 rounded-full font-label-md text-label-md transition-all ${
        activa ? "bg-secondary text-on-secondary" : "bg-surface text-on-surface-variant hover:bg-surface-container"
      }`}
    >
      {children}
    </button>
  );
}

// Barra fija con las categorías del catálogo, los filtros (municipio, calificación, fecha, presupuesto) y el orden.
export default function BarraFiltros({ filtros, categorias, municipios, totalCatalogo, onEditar, onAplicar, onOrden }) {
  return (
    <section className="w-full bg-surface-container-lowest shadow-sm sticky top-20 z-40">
      <div className="max-w-[1360px] mx-auto px-gutter py-space-sm flex flex-col gap-space-sm">
        <div className="flex items-center gap-2 overflow-x-auto pb-1 text-nowrap">
          <Categoria activa={filtros.categoria === ""} onClick={() => onAplicar({ categoria: "" })}>
            <span className="material-symbols-outlined text-[18px]">apps</span>
            <span>Todos ({totalCatalogo})</span>
          </Categoria>
          {categorias.map(([cat, cantidad]) => (
            <Categoria key={cat} activa={filtros.categoria === cat} onClick={() => onAplicar({ categoria: filtros.categoria === cat ? "" : cat })}>
              <span className="material-symbols-outlined text-[18px] text-secondary">{CATEGORIA_ICONOS[cat] || "place"}</span>
              <span>{cat} ({cantidad})</span>
            </Categoria>
          ))}
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
          <div className="flex flex-wrap items-center gap-2">
            <div className="relative">
              <select className={SELECT} value={filtros.municipio} onChange={(e) => onAplicar({ municipio: e.target.value })}>
                <option value="">Municipio: Todos</option>
                {municipios.map((m) => <option key={m} value={m}>{m}</option>)}
              </select>
              <span className={FLECHA}>arrow_drop_down</span>
            </div>
            <div className="relative">
              <select aria-label="Calificación mínima" className={SELECT} value={filtros.calificacion_min} onChange={(e) => onAplicar({ calificacion_min: e.target.value })}>
                <option value="">Calificación: todas</option>
                <option value="3">3 estrellas o más</option>
                <option value="4">4 estrellas o más</option>
                <option value="4.5">4,5 estrellas o más</option>
              </select>
              <span className={FLECHA}>arrow_drop_down</span>
            </div>
            <label className="flex items-center gap-2 pl-3 rounded-xl bg-surface shadow-sm font-label-md text-label-md text-on-surface-variant">
              <span className="whitespace-nowrap">Disponible el</span>
              <input
                type="date"
                aria-label="Disponible el"
                min={fechaMinima()}
                value={filtros.fecha}
                onChange={(e) => onAplicar({ fecha: e.target.value })}
                className="py-2 pr-3 bg-transparent text-on-surface focus:outline-none"
              />
              {filtros.fecha && (
                <button type="button" aria-label="Quitar fecha" onClick={() => onAplicar({ fecha: "" })} className="pr-2 text-outline hover:text-error">
                  <span className="material-symbols-outlined text-[18px]">close</span>
                </button>
              )}
            </label>
            <div className="relative">
              <input
                type="number"
                placeholder="Presupuesto máx. (COP)"
                className={SELECT}
                value={filtros.presupuesto_max}
                onChange={(e) => onEditar({ presupuesto_max: e.target.value })}
                onBlur={() => onAplicar({})}
              />
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span className="font-body-sm text-body-sm text-on-surface-variant hidden sm:inline">Ordenar:</span>
            <div className="relative">
              <select
                className="appearance-none pl-3 pr-8 py-2 rounded-xl bg-surface-container font-label-md text-label-md text-primary font-semibold focus:outline-none cursor-pointer"
                value={filtros.orden}
                onChange={(e) => onOrden(e.target.value)}
              >
                <option value="relevancia">Relevancia</option>
                <option value="cercania">Más cercanos a mí</option>
                <option value="calificacion">Mejor calificados</option>
                <option value="precio_asc">$ Menor precio</option>
                <option value="precio_desc">$ Mayor precio</option>
              </select>
              <span className="material-symbols-outlined absolute right-2 top-1/2 -translate-y-1/2 text-primary pointer-events-none text-[18px]">expand_more</span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
