import BotonFavorito from "../BotonFavorito";
import { Estrellas } from "../Estrellas";
import { CATEGORIA_ICONOS } from "../../constants";

const CHIP = "inline-flex items-center gap-1.5 px-3 py-1 rounded-full font-label-xs text-label-xs font-semibold";

// Lo primero que se ve del servicio: qué es, quién lo ofrece, su calificación y las acciones (favorito y compartir).
export default function EncabezadoSitio({ sitio, onCompartir }) {
  const activo = sitio.estado === "activo";
  return (
    <header className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center gap-2">
        <span className={`${CHIP} bg-secondary-container text-on-secondary-container`}>
          <span className="material-symbols-outlined text-[15px]">{CATEGORIA_ICONOS[sitio.categoria] || "place"}</span>
          {sitio.categoria}
        </span>
        {sitio.Prestador?.estado_verificacion === "aprobado" && (
          <span className={`${CHIP} bg-surface-container text-on-surface`}>
            <span className="material-symbols-outlined text-[15px] text-secondary">verified</span> Prestador verificado
          </span>
        )}
        <span className={`${CHIP} ${activo ? "bg-primary-fixed text-on-primary-fixed-variant" : "bg-surface-container text-on-surface-variant"}`}>
          <span className="material-symbols-outlined text-[15px]">{activo ? "check_circle" : "pause_circle"}</span>
          {activo ? "Disponible" : "No disponible actualmente"}
        </span>
      </div>

      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3 sm:gap-4">
        <h1 className="font-headline-xl md:font-display-lg text-headline-xl md:text-display-lg text-primary tracking-tight leading-tight min-w-0 break-words">{sitio.nombre}</h1>
        <div className="flex items-center gap-2 shrink-0 sm:pt-1">
          <BotonFavorito sitioId={sitio.id} className="!w-10 !h-10" />
          <button onClick={onCompartir} className="px-4 py-2 rounded-xl bg-surface-container hover:bg-surface-container-high text-primary font-label-md text-label-md flex items-center gap-1.5 transition-colors">
            <span className="material-symbols-outlined text-[18px]">share</span>
            Compartir
          </button>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-y-1 gap-x-4 text-on-surface-variant font-body-md text-body-md">
        <div className="flex items-center gap-1">
          <span className="material-symbols-outlined text-[18px] text-secondary">location_on</span>
          <span>{sitio.municipio}, Caquetá</span>
        </div>
        {sitio.total_resenas > 0 && (
          <div className="flex items-center gap-1.5">
            <Estrellas valor={sitio.calificacion_promedio} tamano={16} />
            <span>{sitio.calificacion_promedio} ({sitio.total_resenas})</span>
          </div>
        )}
        {sitio.Prestador && (
          <div className="flex items-center gap-1">
            <span className="material-symbols-outlined text-[18px] text-secondary">storefront</span>
            <span>{sitio.Prestador.nombre_negocio}</span>
          </div>
        )}
      </div>
    </header>
  );
}
