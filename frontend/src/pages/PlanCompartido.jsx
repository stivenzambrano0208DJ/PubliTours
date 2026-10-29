import { Link, useParams } from "react-router-dom";
import { api, urlImagen } from "../api/client";
import { CATEGORIA_ICONOS } from "../constants";
import { useConsulta } from "../hooks/useConsulta";
import { fechaCorta, fechaDelDia } from "../utils/fechas";
import { itemsPorDia, totalEstimado } from "../utils/itinerario";
import { pesos } from "../utils/moneda";
import { useIdioma } from "../context/idioma";

// Itinerario que alguien compartió con un enlace: solo lectura, sin sesión y sin datos de quien lo armó.
export default function PlanCompartido() {
  const { t, locale } = useIdioma();
  const { token } = useParams();
  const { datos: plan, error, cargando } = useConsulta(token, () => api.itinerarioCompartido(token));

  if (cargando) return <p role="status" className="p-space-xl text-center text-on-surface-variant">{t("Cargando itinerario…")}</p>;
  if (error || !plan) {
    return (
      <div className="max-w-xl mx-auto px-gutter py-space-xl text-center flex flex-col items-center gap-3">
        <span className="material-symbols-outlined text-[48px] text-outline" aria-hidden="true">link_off</span>
        <h1 className="font-headline-md text-headline-md text-primary">{t("Este itinerario no está disponible")}</h1>
        <p className="font-body-md text-body-md text-on-surface-variant">{error || t("El enlace ya no se comparte o no existe.")}</p>
        <Link to="/itinerario" className="mt-2 px-5 py-2.5 rounded-xl bg-primary text-on-primary font-label-md text-label-md hover:bg-primary-container transition-colors">
          {t("Crear mi propio itinerario")}
        </Link>
      </div>
    );
  }

  const grupos = itemsPorDia(plan.items);
  const conFecha = Boolean(plan.fecha_inicio);
  const total = totalEstimado(plan.items, plan.personas);

  return (
    <div className="max-w-3xl mx-auto px-gutter py-space-xl flex flex-col gap-space-lg">
      <meta name="robots" content="noindex, nofollow" />
      <header className="flex flex-col gap-2">
        <span className="inline-flex self-start items-center gap-1.5 px-3 py-1 rounded-full bg-secondary-container/40 text-secondary font-label-xs text-label-xs font-semibold">
          <span className="material-symbols-outlined text-[14px]" aria-hidden="true">share</span>
          {t("Itinerario compartido")}
        </span>
        <h1 className="font-headline-xl text-headline-xl text-primary tracking-tight">{t("Un viaje por el Caquetá")}</h1>
        <p className="font-body-lg text-body-lg text-on-surface-variant">
          {(plan.dias === 1 ? t("1 día", { n: plan.dias }) : t("{n} días", { n: plan.dias }))} · {(plan.personas === 1 ? t("1 persona", { n: plan.personas }) : t("{n} personas", { n: plan.personas }))}
          {conFecha && ` · ${t("desde el {fecha}", { fecha: fechaCorta(plan.fecha_inicio, locale) })}`}
        </p>
      </header>

      {grupos.length === 0 && (
        <p className="p-4 rounded-2xl bg-surface-container-low text-on-surface-variant font-body-md text-body-md">
          {t("Por ahora ninguna de las actividades de este plan está disponible.")}
        </p>
      )}

      {grupos.map(({ dia, items }) => (
        <section key={dia} aria-labelledby={`dia-${dia}`} className="flex flex-col gap-3">
          <h2 id={`dia-${dia}`} className="flex items-center gap-3 font-title-lg text-title-lg text-on-surface font-semibold">
            <span className="w-8 h-8 rounded-full bg-primary-container text-on-primary flex items-center justify-center font-title-sm text-title-sm font-bold" aria-hidden="true">{dia}</span>
            {t("Día")} {dia}
            {conFecha && <span className="font-body-md text-body-md text-on-surface-variant font-normal capitalize">· {fechaCorta(fechaDelDia(plan.fecha_inicio, dia), locale)}</span>}
          </h2>
          {items.map(({ id, sitio, justificacion }) => (
            <article key={id} className="flex flex-col sm:flex-row gap-4 p-space-md rounded-2xl bg-surface-container-lowest shadow-sm">
              <div className="w-full sm:w-36 h-28 rounded-xl overflow-hidden shrink-0 bg-gradient-to-br from-primary-container to-secondary flex items-center justify-center">
                {sitio.imagen_url
                  ? <img loading="lazy" decoding="async" src={urlImagen(sitio.imagen_url)} alt="" className="w-full h-full object-cover" />
                  : <span className="material-symbols-outlined text-on-primary text-[34px] opacity-80" aria-hidden="true">{CATEGORIA_ICONOS[sitio.categoria] || "place"}</span>}
              </div>
              <div className="flex flex-col gap-1 flex-1">
                <p className="font-label-xs text-label-xs text-secondary font-semibold">{sitio.categoria} · {sitio.municipio}</p>
                <h3 className="font-title-sm text-title-sm text-on-surface font-semibold">{sitio.nombre}</h3>
                {justificacion && <p className="font-body-sm text-body-sm text-on-surface-variant">{justificacion}</p>}
                <div className="mt-auto flex items-center justify-between gap-2 pt-2">
                  <span className="font-title-sm text-title-sm font-bold text-primary">
                    {Number(sitio.precio) === 0 ? "Gratuito" : `${pesos(Number(sitio.precio) * plan.personas)} COP`}
                  </span>
                  <Link to={`/sitios/${sitio.id}`} className="font-label-md text-label-md text-secondary font-semibold hover:underline">{t("Ver servicio")}</Link>
                </div>
              </div>
            </article>
          ))}
        </section>
      ))}

      {grupos.length > 0 && (
        <p className="font-title-sm text-title-sm text-on-surface">
          {t("Total estimado:")} <strong className="text-primary">{pesos(total)} COP</strong>
          <span className="block font-label-xs text-label-xs text-on-surface-variant font-normal">{t("Calculado con los precios publicados hoy; pueden cambiar.")}</span>
        </p>
      )}

      <div className="p-space-lg rounded-3xl bg-gradient-to-br from-primary-container to-secondary text-on-primary flex flex-col gap-2">
        <h2 className="font-title-lg text-title-lg font-bold">{t("¿Te gustó este plan?")}</h2>
        <p className="font-body-sm text-body-sm text-on-primary/85">{t("Crea el tuyo con tu presupuesto, tus fechas y tus intereses.")}</p>
        <Link to="/itinerario" className="self-start mt-1 inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-surface-container-lowest text-primary font-label-md text-label-md font-bold hover:bg-white transition-colors">
          <span className="material-symbols-outlined text-[18px] text-secondary" aria-hidden="true">auto_awesome</span>
          {t("Crear mi itinerario")}
        </Link>
      </div>
    </div>
  );
}
