import { useState } from "react";
import { fechaDelDia, fechaCorta } from "../../utils/fechas";
import { itemsPorDia } from "../../utils/itinerario";
import ActividadItinerario from "./ActividadItinerario";
import { useIdioma } from "../../context/idioma";

const PESTANA = (activa) => `px-4 py-2.5 rounded-xl font-label-md text-label-md transition-all ${
  activa ? "bg-primary-container text-on-primary shadow-sm" : "text-on-surface-variant hover:bg-surface-container-lowest"
}`;

// Las actividades agrupadas por día, con la fecha real de cada uno y pestañas para ver un solo día.
export default function LineaDelTiempo({ items, fechaInicio, personas, reservando, reservados, onReservar }) {
  const { t, locale } = useIdioma();
  const [diaActivo, setDiaActivo] = useState("todos");
  const grupos = itemsPorDia(items);

  return (
    <div className="lg:col-span-8 flex flex-col gap-space-lg">
      <div className="flex flex-wrap items-center gap-2 p-1.5 rounded-2xl bg-surface-container shadow-sm">
        <button onClick={() => setDiaActivo("todos")} className={`${PESTANA(diaActivo === "todos")} font-semibold`}>
          {t("Vista Completa ({n} días)", { n: grupos.length })}
        </button>
        {grupos.map(({ dia }) => (
          <button key={dia} onClick={() => setDiaActivo(dia)} className={`${PESTANA(diaActivo === dia)} font-medium`}>
            {t("Día {n}", { n: dia })} · {fechaCorta(fechaDelDia(fechaInicio, dia), locale)}
          </button>
        ))}
      </div>

      {grupos.filter(({ dia }) => diaActivo === "todos" || diaActivo === dia).map(({ dia, items: delDia }) => (
        <div key={dia} className="flex flex-col gap-space-md">
          <div className="flex items-center gap-3 p-4 rounded-xl bg-surface-container-high/60">
            <span className="w-8 h-8 rounded-full bg-primary-container text-on-primary flex items-center justify-center font-title-sm text-title-sm font-bold">{dia}</span>
            <h2 className="font-title-lg text-title-lg text-on-surface font-semibold">
              {t("Día {n}", { n: dia })} <span className="font-body-md text-body-md text-on-surface-variant font-normal capitalize">· {fechaCorta(fechaDelDia(fechaInicio, dia), locale)}</span>
            </h2>
          </div>
          <div className="flex flex-col gap-4">
            {delDia.map((item) => (
              <ActividadItinerario
                key={item.id}
                item={item}
                personas={personas}
                reservando={reservando === item.id}
                reservado={reservados.has(item.id)}
                onReservar={onReservar}
              />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
