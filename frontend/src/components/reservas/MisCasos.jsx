import { api } from "../../api/client";
import { useConsulta } from "../../hooks/useConsulta";
import { MOTIVOS_CASO, ESTADOS_CASO } from "../../utils/soporte";
import { useIdioma } from "../../context/idioma";
import Tarjeta from "../ui/Tarjeta";

const fecha = (iso, locale) => new Date(iso).toLocaleDateString(locale, { day: "numeric", month: "short", year: "numeric" });

// Los casos de soporte que abrió la persona, con su estado y la respuesta de la administración. Sin casos no se muestra nada.
// `version` cambia cuando se abre uno nuevo, para volver a cargar la lista.
export default function MisCasos({ version = 0 }) {
  const { t, td, locale } = useIdioma();
  const { datos: casos } = useConsulta(`mis-casos-${version}`, () => api.misCasos());
  if (!casos?.length) return null;

  return (
    <Tarjeta as="section" aria-labelledby="titulo-mis-casos" className="p-5 flex flex-col gap-3">
      <h2 id="titulo-mis-casos" className="font-title-lg text-title-lg text-on-surface font-semibold flex items-center gap-2">
        <span className="material-symbols-outlined text-secondary" aria-hidden="true">support_agent</span>
        {t("Mis casos de soporte")}
      </h2>
      {casos.map((c) => (
        <article key={c.id} className="p-4 rounded-xl bg-surface-container-low flex flex-col gap-1.5">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <span className="font-title-sm text-title-sm text-on-surface font-semibold">{c.servicio}</span>
            <span className={`px-2.5 py-0.5 rounded-full font-label-xs text-label-xs font-semibold ${ESTADOS_CASO[c.estado]?.chip || ""}`}>{td(ESTADOS_CASO[c.estado]?.texto) || c.estado}</span>
          </div>
          <p className="font-label-xs text-label-xs text-on-surface-variant">
            {td(MOTIVOS_CASO[c.motivo]) || c.motivo} · {t("abierto el {fecha}", { fecha: fecha(c.creado_en, locale) })}{c.codigo ? ` · ${t("reserva {codigo}", { codigo: c.codigo })}` : ""}
          </p>
          <p className="font-body-sm text-body-sm text-on-surface">{c.detalle}</p>
          {c.respuesta && (
            <div className="mt-1 pl-3 border-l-2 border-secondary">
              <p className="font-label-xs text-label-xs text-secondary font-semibold">{t("Respuesta de la administración")}</p>
              <p className="font-body-sm text-body-sm text-on-surface">{c.respuesta}</p>
            </div>
          )}
        </article>
      ))}
    </Tarjeta>
  );
}
