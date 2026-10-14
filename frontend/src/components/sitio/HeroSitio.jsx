import { urlImagen } from "../../api/client";
import BotonFavorito from "../BotonFavorito";
import { Estrellas } from "../Estrellas";
import { CATEGORIA_ICONOS } from "../../constants";

const BOTON_VIDRIO = "px-4 py-2 rounded-xl bg-surface-container-lowest/15 hover:bg-surface-container-lowest/25 backdrop-blur-md text-on-primary font-label-md text-label-md flex items-center gap-1.5 transition-all";

// Portada del servicio: foto real con degradado (o un icono si aún no tiene), estado, calificación, prestador y acciones.
export default function HeroSitio({ sitio, fotos, onAbrirVisor, onCompartir }) {
  const activo = sitio.estado === "activo";
  return (
    <section className="relative w-full overflow-hidden -mt-1">
      <div className="relative w-full h-[360px] md:h-[440px] bg-primary-container">
        {fotos.length > 0 ? (
          <button onClick={() => onAbrirVisor(0)} className="absolute inset-0 w-full h-full">
            <img src={urlImagen(fotos[0])} alt={sitio.nombre} className="w-full h-full object-cover opacity-45 mix-blend-luminosity" loading="eager" />
          </button>
        ) : (
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="material-symbols-outlined text-on-primary text-[96px] opacity-60">{CATEGORIA_ICONOS[sitio.categoria] || "place"}</span>
          </div>
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-primary via-primary/80 to-transparent pointer-events-none" />

        <div className="absolute inset-x-0 bottom-0 max-w-[1360px] mx-auto px-gutter pb-space-lg text-on-primary">
          <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-space-md">
            <div className="flex flex-col gap-2 max-w-3xl">
              <div className="flex flex-wrap items-center gap-2">
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-secondary-container text-on-secondary-container font-label-xs text-label-xs font-semibold">
                  <span className="material-symbols-outlined text-[15px]">{CATEGORIA_ICONOS[sitio.categoria] || "place"}</span>
                  {sitio.categoria}
                </span>
                {sitio.Prestador?.estado_verificacion === "aprobado" && (
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-surface-container-lowest/20 backdrop-blur-sm text-on-primary font-label-xs text-label-xs font-medium">
                    <span className="material-symbols-outlined text-[15px] text-secondary-fixed">verified</span> Prestador verificado
                  </span>
                )}
                <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full font-label-xs text-label-xs font-semibold ${
                  activo ? "bg-primary-fixed text-on-primary-fixed-variant" : "bg-surface-container-lowest/20 backdrop-blur-sm text-on-primary"
                }`}>
                  <span className="material-symbols-outlined text-[15px]">{activo ? "check_circle" : "pause_circle"}</span>
                  {activo ? "Disponible" : "No disponible actualmente"}
                </span>
              </div>

              <h1 className="font-headline-xl md:font-display-lg text-headline-xl md:text-display-lg text-surface-bright tracking-tight leading-none">{sitio.nombre}</h1>

              <div className="flex flex-wrap items-center gap-y-1 gap-x-4 text-surface-dim font-body-sm text-body-sm">
                <div className="flex items-center gap-1">
                  <span className="material-symbols-outlined text-[18px] text-secondary-fixed">location_on</span>
                  <span>{sitio.municipio}, Caquetá</span>
                </div>
                {sitio.total_resenas > 0 && (
                  <>
                    <span className="w-1 h-1 rounded-full bg-surface-dim" />
                    <div className="flex items-center gap-1.5">
                      <Estrellas valor={sitio.calificacion_promedio} tamano={16} />
                      <span>{sitio.calificacion_promedio} ({sitio.total_resenas})</span>
                    </div>
                  </>
                )}
                {sitio.Prestador && (
                  <>
                    <span className="w-1 h-1 rounded-full bg-surface-dim" />
                    <div className="flex items-center gap-1">
                      <span className="material-symbols-outlined text-[18px] text-secondary-fixed">storefront</span>
                      <span>{sitio.Prestador.nombre_negocio}</span>
                    </div>
                  </>
                )}
              </div>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <BotonFavorito sitioId={sitio.id} className="!w-10 !h-10" />
              <button onClick={onCompartir} className={BOTON_VIDRIO}>
                <span className="material-symbols-outlined text-[18px]">share</span>
                Compartir
              </button>
              {fotos.length > 1 && (
                <button onClick={() => onAbrirVisor(0)} className={BOTON_VIDRIO}>
                  <span className="material-symbols-outlined text-[18px]">photo_library</span>
                  Ver {fotos.length} fotos
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
