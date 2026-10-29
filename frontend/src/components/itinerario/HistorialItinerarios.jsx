import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../../api/client";
import { fechaDelDia, fechaCorta } from "../../utils/fechas";
import { useIdioma } from "../../context/idioma";

// Itinerarios generados anteriormente por el turista (guardados en la base de datos).
export default function HistorialItinerarios({ recargarKey }) {
  const { t, locale } = useIdioma();
  const [itinerarios, setItinerarios] = useState([]);
  const [abierto, setAbierto] = useState(null);

  useEffect(() => {
    api.misItinerarios().then(setItinerarios).catch(() => {});
  }, [recargarKey]);

  if (itinerarios.length === 0) return null;

  return (
    <section className="mt-space-xl">
      <h2 className="font-headline-md text-headline-md text-primary font-bold mb-space-sm">{t("Mis itinerarios anteriores")}</h2>
      <div className="flex flex-col gap-space-sm">
        {itinerarios.map((it) => {
          const items = it.items || [];
          const total = items.reduce((s, i) => s + Number(i.sitio?.precio || 0), 0);
          const expandido = abierto === it.id;
          return (
            <div key={it.id} className="bg-surface-container-lowest rounded-2xl shadow-sm overflow-hidden">
              <button onClick={() => setAbierto(expandido ? null : it.id)} className="w-full flex items-center justify-between gap-3 p-space-md text-left hover:bg-surface-container-low transition-colors">
                <div>
                  <p className="font-title-sm text-title-sm text-on-surface font-semibold">
                    {t("{n} día(s)", { n: it.dias })} · {t("{n} actividad(es)", { n: items.length })} · {t("presupuesto {valor}", { valor: `$${Number(it.presupuesto).toLocaleString(locale)}` })}
                  </p>
                  <p className="font-label-xs text-label-xs text-on-surface-variant">
                    {it.fecha_inicio ? `${t("Viaje del {fecha}", { fecha: fechaCorta(it.fecha_inicio, locale) })} · ${(it.personas === 1 ? t("1 persona", { n: it.personas }) : t("{n} personas", { n: it.personas }))} · ` : ""}{t("Creado el {fecha}", { fecha: new Date(it.fecha_creacion).toLocaleDateString(locale) })}
                    {it.preferencias ? ` · ${it.preferencias}` : ""}
                  </p>
                </div>
                <span className="material-symbols-outlined text-on-surface-variant">{expandido ? "expand_less" : "expand_more"}</span>
              </button>
              {expandido && (
                <div className="px-space-md pb-space-md flex flex-col gap-2">
                  {items.map((i) => (
                    <Link key={i.id} to={`/sitios/${i.sitio_id}`} className="flex items-center justify-between gap-3 p-3 rounded-xl bg-surface-container-low hover:bg-surface-container transition-colors">
                      <span className="font-body-sm text-body-sm text-on-surface">
                        <strong className="text-secondary">{t("Día {n}", { n: i.dia })}{it.fecha_inicio ? ` · ${fechaCorta(fechaDelDia(it.fecha_inicio, i.dia), locale)}` : ""}</strong> · {i.sitio?.nombre}
                        <span className="text-on-surface-variant"> — {i.sitio?.municipio}</span>
                      </span>
                      <span className="font-label-xs text-label-xs text-primary font-semibold shrink-0">
                        {Number(i.sitio?.precio) === 0 ? t("Gratuito") : `$${Number(i.sitio?.precio).toLocaleString(locale)}`}
                      </span>
                    </Link>
                  ))}
                  <p className="font-label-xs text-label-xs text-on-surface-variant text-right">{t("Costo estimado: {valor} COP", { valor: `$${total.toLocaleString(locale)}` })}</p>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </section>
  );
}
