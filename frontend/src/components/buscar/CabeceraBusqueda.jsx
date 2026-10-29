import { TIPOS_VIAJE } from "../../constants";
import { useIdioma } from "../../context/idioma";

// Encabezado de Explorar: título, buscador por texto y filtro rápido por interés.
export default function CabeceraBusqueda({ filtros, totalCatalogo, onEditar, onAplicar }) {
  const { t, td } = useIdioma();
  const buscar = (e) => {
    e.preventDefault();
    onAplicar({});
  };

  return (
    <section className="relative w-full overflow-hidden bg-surface-container-low px-gutter py-space-xl">
      <div className="absolute -top-24 -right-24 w-96 h-96 rounded-full bg-secondary-fixed/20 blur-3xl pointer-events-none" />
      <div className="absolute top-1/2 left-10 w-72 h-72 rounded-full bg-secondary-container/25 blur-3xl pointer-events-none" />

      <div className="relative max-w-[1360px] mx-auto flex flex-col gap-space-md">
        <div className="flex items-center gap-space-xs text-on-surface-variant font-label-md text-label-md">
          <span className="text-secondary font-semibold">Caquetá Vive IA</span>
          <span className="material-symbols-outlined text-[14px]">chevron_right</span>
          <span>{t("Explorador de Destinos")}</span>
        </div>

        <div className="max-w-3xl">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-surface-container-lowest text-secondary font-label-xs text-label-xs font-semibold shadow-sm mb-3">
            <span className="material-symbols-outlined text-[16px] text-tertiary-fixed-dim">verified</span>
            <span>{t("{n} destinos verificados en el catálogo", { n: totalCatalogo })}</span>
          </div>
          <h1 className="font-headline-xl text-headline-xl tracking-tight text-primary font-bold">
            {t("Explora los Tesoros del Caquetá")}
          </h1>
          <p className="font-body-lg text-body-lg text-on-surface-variant mt-2 max-w-2xl">
            {t("Catálogo real de sitios y servicios turísticos, cargados y verificados por prestadores locales.")}
          </p>
        </div>

        <form className="mt-space-sm p-2 rounded-2xl bg-surface-container-lowest shadow-sm" onSubmit={buscar}>
          <div className="flex flex-col lg:flex-row items-stretch lg:items-center gap-2">
            <div className="flex-1 flex items-center gap-3 px-4 py-3 rounded-xl bg-surface">
              <span className="material-symbols-outlined text-secondary text-[22px]">travel_explore</span>
              <input
                className="w-full bg-transparent text-on-surface font-body-md text-body-md placeholder:text-outline focus:outline-none"
                placeholder={t("¿Qué experiencia buscas? Ej: cascadas, fincas, gastronomía...")}
                type="text"
                value={filtros.texto}
                onChange={(e) => onEditar({ texto: e.target.value })}
              />
              {filtros.texto && (
                <button type="button" className="text-outline hover:text-on-surface p-1 rounded-full" onClick={() => onAplicar({ texto: "" })}>
                  <span className="material-symbols-outlined text-[18px]">close</span>
                </button>
              )}
            </div>
            <button type="submit" className="flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-primary text-on-primary font-label-md text-label-md hover:bg-primary-container shadow-sm transition-all">
              <span className="material-symbols-outlined text-[18px]">search</span>
              <span>{t("Explorar")}</span>
            </button>
          </div>

          <div className="flex flex-wrap items-center gap-2 pt-3 px-3">
            <span className="font-label-xs text-label-xs text-on-surface-variant uppercase tracking-wider">{t("Filtrar por interés:")}</span>
            {TIPOS_VIAJE.filter((tv) => tv.value).map((tv) => (
              <button
                key={tv.value}
                type="button"
                onClick={() => onAplicar({ tipo_viaje: filtros.tipo_viaje === tv.value ? "" : tv.value })}
                className={`flex items-center gap-1.5 px-3 py-1 rounded-full font-label-xs text-label-xs transition-all ${
                  filtros.tipo_viaje === tv.value
                    ? "bg-secondary text-on-secondary"
                    : "bg-surface-container-high text-on-surface hover:bg-secondary-container/40 hover:text-secondary"
                }`}
              >
                {td(tv.label)}
              </button>
            ))}
          </div>
        </form>
      </div>
    </section>
  );
}
