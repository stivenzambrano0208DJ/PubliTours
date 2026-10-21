import { urlImagen } from "../../api/client";
import { CATEGORIA_ICONOS } from "../../constants";

// Una actividad del plan: foto, por qué se eligió, precio para el grupo y botón de reserva.
export default function ActividadItinerario({ item, personas, reservando, reservado, onReservar }) {
  const { sitio } = item;
  const gratis = Number(sitio.precio) === 0;

  return (
    <div className="flex flex-col sm:flex-row gap-4 p-space-md rounded-2xl bg-surface-container-lowest shadow-sm hover:shadow-md transition-shadow">
      <div className="w-full sm:w-40 h-32 rounded-xl overflow-hidden shrink-0 relative bg-gradient-to-br from-primary-container to-secondary flex items-center justify-center">
        {sitio.imagen_url ? (
          <img loading="lazy" decoding="async" src={urlImagen(sitio.imagen_url)} alt="" className="w-full h-full object-cover" />
        ) : (
          <span className="material-symbols-outlined text-on-primary text-[36px] opacity-80">{CATEGORIA_ICONOS[sitio.categoria] || "place"}</span>
        )}
      </div>
      <div className="flex flex-col justify-between flex-1">
        <div>
          <div className="flex flex-wrap items-center gap-2 mb-1">
            <span className="px-2 py-0.5 rounded-md bg-surface-container-high font-label-xs text-label-xs font-semibold text-primary">{sitio.categoria}</span>
            <span className="font-label-xs text-label-xs text-on-surface-variant">{sitio.municipio}</span>
          </div>
          <h3 className="font-title-sm text-title-sm text-on-surface font-semibold">{sitio.nombre}</h3>
          <p className="font-body-sm text-body-sm text-on-surface-variant mt-1">{sitio.descripcion || "Sin descripción disponible."}</p>
        </div>
        <div className="mt-3 p-2.5 rounded-lg bg-surface-container-low flex items-center gap-2 text-on-surface-variant font-label-xs text-label-xs">
          <span className="material-symbols-outlined text-secondary text-[16px]">psychology</span>
          <span>{item.justificacion}</span>
        </div>
        <div className="mt-3 flex items-center justify-between">
          <span className="font-title-sm text-title-sm font-bold text-primary">
            {gratis ? "Gratuito" : `${(Number(sitio.precio) * personas).toLocaleString("es-CO")} COP`}
            {personas > 1 && !gratis && <span className="ml-1 font-label-xs text-label-xs text-on-surface-variant font-normal">({personas} personas)</span>}
          </span>
          <button
            onClick={() => onReservar(item)}
            disabled={reservando || reservado}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-primary text-on-primary font-label-md text-label-md hover:bg-primary-container shadow-sm transition-all disabled:opacity-60"
          >
            <span className="material-symbols-outlined text-[16px]">{reservado ? "check_circle" : "bookmark_added"}</span>
            <span>{reservado ? "Reservado" : reservando ? "Reservando..." : "Reservar"}</span>
          </button>
        </div>
      </div>
    </div>
  );
}
