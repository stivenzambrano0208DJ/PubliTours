import { pesos } from "../../utils/moneda";
import { useIdioma } from "../../context/idioma";

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
  const { t } = useIdioma();
  return (
    <section className="w-full -mt-6">
      <div className="max-w-[1360px] mx-auto px-gutter">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 p-space-md rounded-2xl bg-surface-container-lowest shadow-xl">
          <Dato icono="calendar_today" etiqueta={t("Duración")} valor={t("{n} día(s)", { n: itinerario.dias })} />
          <Dato icono="route" etiqueta={t("Actividades")} valor={t("{n} incluidas", { n: itinerario.items.length })} />
          <Dato icono="payments" etiqueta={t("Presupuesto usado")} valor={`${pesos(presupuestoUsado)} / ${pesos(itinerario.presupuesto)}`} destacado />
          <Dato icono="location_on" etiqueta={t("Municipios")} valor={municipios.length} />
        </div>
      </div>
    </section>
  );
}
