import ExportarItinerario from "./ExportarItinerario";
import { pesos } from "../../utils/moneda";
import { useIdioma } from "../../context/idioma";


// Columna derecha: municipios del plan, resumen de costos (por el grupo), «Reservar todo» y exportar.
export default function PanelLateralItinerario({ itinerario, municipios, presupuestoUsado, fechaInicio, personas, todoReservado, onReservarTodo }) {
  const { t, locale } = useIdioma();
  return (
    <div className="lg:col-span-4 flex flex-col gap-space-lg">
      <div className="flex flex-col rounded-2xl bg-surface-container-lowest shadow-md overflow-hidden">
        <div className="p-space-md">
          <h3 className="font-title-sm text-title-sm text-on-surface font-semibold">{t("Destinos incluidos")}</h3>
          <p className="font-label-xs text-label-xs text-on-surface-variant">{municipios.length} municipio(s) en tu itinerario</p>
        </div>
        <div className="px-space-md pb-space-md flex flex-col gap-2.5">
          {municipios.map((m, idx) => (
            <div key={m} className="flex items-start gap-2.5">
              <span className="w-5 h-5 rounded-full bg-primary-container text-on-primary flex items-center justify-center font-label-xs text-label-xs shrink-0 mt-0.5">
                {String.fromCharCode(65 + idx)}
              </span>
              <div className="flex-1 min-w-0">
                <p className="font-label-md text-label-md font-semibold text-on-surface truncate">{m}</p>
                <p className="font-body-sm text-body-sm text-on-surface-variant truncate">
                  {t("{n} actividad(es)", { n: itinerario.items.filter((i) => i.sitio.municipio === m).length })}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="flex flex-col p-space-md rounded-2xl bg-surface-container-lowest shadow-xl">
        <div className="flex items-center justify-between pb-3">
          <span className="font-title-sm text-title-sm text-on-surface font-semibold">{t("Resumen del itinerario")}</span>
        </div>
        <div className="flex flex-col gap-2.5 py-3 font-body-sm text-body-sm text-on-surface-variant">
          {itinerario.items.map((item) => (
            <div key={item.id} className="flex justify-between items-center gap-2">
              <span className="truncate">{item.sitio.nombre}</span>
              <span className="font-medium text-on-surface shrink-0">
                {Number(item.sitio.precio) === 0 ? t("Gratis") : (Number(item.sitio.precio) * personas).toLocaleString(locale)}
              </span>
            </div>
          ))}
        </div>
        <div className="pt-3 p-3 rounded-xl bg-surface-container-low flex flex-col gap-1 mb-4">
          <div className="flex items-baseline justify-between">
            <span className="font-label-md text-label-md text-on-surface font-medium">{t("Total estimado:")}</span>
            <span className="font-headline-md text-headline-md text-primary font-bold">{pesos(presupuestoUsado)} COP</span>
          </div>
          <div className="flex items-center justify-between font-label-xs text-label-xs text-on-surface-variant">
            <span>{t("Presupuesto declarado:")}</span>
            <span className="font-semibold text-on-surface">{pesos(itinerario.presupuesto)} COP</span>
          </div>
        </div>
        <button
          onClick={onReservarTodo}
          disabled={todoReservado}
          className="w-full py-3.5 px-4 rounded-xl bg-primary text-on-primary font-title-sm text-title-sm font-semibold hover:bg-primary-container shadow-md transition-all flex items-center justify-center gap-2 disabled:opacity-50"
        >
          <span className="material-symbols-outlined text-[20px] text-secondary-fixed">bookmark_added</span>
          <span>{todoReservado ? t("Todo reservado") : t("Reservar todo el itinerario")}</span>
        </button>
        <div className="mt-3">
          <ExportarItinerario itinerario={itinerario} fechaInicio={fechaInicio} personas={personas} />
        </div>
        <div className="mt-4 pt-3 flex flex-col gap-2 font-label-xs text-label-xs text-on-surface-variant">
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-[16px] text-secondary">info</span>
            <span>{t("Cada reserva queda en estado pendiente hasta que el prestador la confirme.")}</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-[16px] text-secondary">verified_user</span>
            <span>{t("Solo se incluyen sitios verificados por el administrador de la plataforma.")}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
