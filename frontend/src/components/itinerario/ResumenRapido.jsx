import { pesos } from "../../utils/moneda";

function Dato({ icono, etiqueta, valor, destacado = false }) {
  return (
    <div className={`flex items-center gap-3 p-3 rounded-xl ${destacado ? "bg-secondary-container/20" : "bg-surface-container-low/60"}`}>
      <div className={`w-10 h-10 rounded-lg flex items-center justify-center shrink-0 ${destacado ? "bg-secondary-container/40 text-secondary" : "bg-surface-container-high text-primary"}`}>
        <span className="material-symbols-outlined text-[22px]">{icono}</span>
      </div>
      <div className="flex flex-col min-w-0">
        <span className={`font-label-xs text-label-xs truncate ${destacado ? "text-secondary" : "text-on-surface-variant"}`}>{etiqueta}</span>
        <span className={`font-title-sm text-title-sm font-semibold truncate ${destacado ? "text-primary" : "text-on-surface"}`}>{valor}</span>
      </div>
    </div>
  );
}

// Cuatro cifras reales del plan: duración, actividades, presupuesto usado y municipios.
export default function ResumenRapido({ itinerario, municipios, presupuestoUsado }) {
  return (
    <section className="w-full -mt-6">
      <div className="max-w-[1360px] mx-auto px-gutter">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 p-space-md rounded-2xl bg-surface-container-lowest shadow-xl">
          <Dato icono="calendar_today" etiqueta="Duración" valor={`${itinerario.dias} día(s)`} />
          <Dato icono="route" etiqueta="Actividades" valor={`${itinerario.items.length} incluidas`} />
          <Dato icono="payments" etiqueta="Presupuesto usado" valor={`${pesos(presupuestoUsado)} / ${pesos(itinerario.presupuesto)}`} destacado />
          <Dato icono="location_on" etiqueta="Municipios" valor={municipios.length} />
        </div>
      </div>
    </section>
  );
}
