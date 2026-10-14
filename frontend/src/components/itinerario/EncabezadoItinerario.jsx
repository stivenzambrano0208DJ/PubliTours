import { fechaMinima } from "../../constants";

const CAMPO = "px-3 py-2 rounded-xl bg-surface-container-lowest border border-surface-container-high outline-none focus:border-secondary";

// Título del plan, fecha de inicio y personas editables (de ellas dependen las fechas y los precios) y «Reservar todo».
export default function EncabezadoItinerario({
  itinerario, municipios, puntajePromedio, fechaInicio, onFechaInicio, personas, onPersonas, todoReservado, onReservarTodo, onVolver,
}) {
  return (
    <section className="w-full bg-surface-container-low/60 pb-space-xl">
      <div className="max-w-[1360px] mx-auto px-gutter pt-space-lg flex flex-col gap-space-md">
        <div className="flex flex-wrap items-center justify-between gap-space-sm">
          <nav className="flex items-center gap-2 font-label-xs text-label-xs text-on-surface-variant">
            <button onClick={onVolver} className="hover:text-primary transition-colors">Crear Itinerario IA</button>
            <span className="material-symbols-outlined text-[14px]">chevron_right</span>
            <span className="text-secondary font-semibold">Itinerario #{itinerario.id}</span>
          </nav>
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-secondary-container/30 text-primary-container font-label-xs text-label-xs shadow-sm">
            <span className="material-symbols-outlined text-secondary text-[16px]">auto_awesome</span>
            <span className="font-semibold text-secondary">Generado por el motor de scoring PubliTours</span>
            <span className="text-outline-variant">•</span>
            <span className="bg-surface-container-lowest px-2 py-0.5 rounded-full font-bold text-on-surface">Puntaje promedio: {puntajePromedio}</span>
          </div>
        </div>

        <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-space-md mt-space-xs">
          <div className="flex flex-col gap-2 max-w-3xl">
            <h1 className="font-display-lg-mobile text-display-lg-mobile lg:font-display-lg lg:text-display-lg text-primary tracking-tight leading-tight">
              Tu itinerario personalizado en el Caquetá
            </h1>
            <p className="font-body-lg text-body-lg text-on-surface-variant">
              {itinerario.dias} día(s) · {municipios.join(", ")} · Presupuesto de ${Number(itinerario.presupuesto).toLocaleString("es-CO")} COP
            </p>
          </div>
          <div className="flex flex-wrap items-end gap-3">
            <label className="flex flex-col gap-1">
              <span className="font-label-xs text-label-xs text-on-surface-variant">Fecha de inicio</span>
              <input type="date" min={fechaMinima()} value={fechaInicio} onChange={(e) => e.target.value && onFechaInicio(e.target.value)} className={CAMPO} />
            </label>
            <label className="flex flex-col gap-1">
              <span className="font-label-xs text-label-xs text-on-surface-variant">Personas</span>
              <input
                type="number" min="1" max="100" value={personas}
                onChange={(e) => onPersonas(Math.max(1, Number(e.target.value) || 1))}
                className={`w-24 ${CAMPO}`}
              />
            </label>
            <button
              onClick={onReservarTodo}
              disabled={todoReservado}
              className="inline-flex items-center justify-center gap-2 px-space-lg py-3 rounded-xl bg-primary-container text-on-primary font-label-md text-label-md shadow-md hover:bg-secondary transition-all disabled:opacity-50 shrink-0"
            >
              <span className="material-symbols-outlined text-[20px] text-secondary-fixed">bookmark_added</span>
              <span>{todoReservado ? "Todo reservado" : "Reservar todo el itinerario"}</span>
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}
