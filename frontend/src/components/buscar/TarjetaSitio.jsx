import { useNavigate } from "react-router-dom";
import { urlImagen } from "../../api/client";
import BotonFavorito from "../BotonFavorito";
import { Estrellas } from "../Estrellas";
import { CATEGORIA_GRADIENTE } from "../../constants";

// Tarjeta de un destino. Un administrador no reserva: en su lugar abre la ficha del servicio.
export default function TarjetaSitio({ sitio, esAdmin, onReservar, onInfo }) {
  const navigate = useNavigate();
  const gratis = Number(sitio.precio) === 0;

  return (
    <article className="group flex flex-col rounded-2xl bg-surface-container-lowest overflow-hidden shadow-[0_4px_20px_-2px_rgba(6,78,59,0.04)] hover:shadow-[0_20px_30px_-6px_rgba(6,78,59,0.08)] transition-all duration-300 hover:-translate-y-1">
      <div
        className={`relative h-48 w-full overflow-hidden flex flex-col justify-between p-3 ${
          sitio.imagen_url ? "bg-cover bg-center" : `bg-gradient-to-br ${CATEGORIA_GRADIENTE[sitio.categoria] || "from-primary-container to-secondary"}`
        }`}
        style={sitio.imagen_url ? { backgroundImage: `url(${urlImagen(sitio.imagen_url)})` } : undefined}
      >
        {sitio.imagen_url && <div className="absolute inset-0 bg-gradient-to-t from-primary/70 via-primary/10 to-transparent" />}
        <div className="relative flex items-center justify-between">
          <span className="px-3 py-1 rounded-full bg-surface-container-lowest/90 backdrop-blur-md text-primary font-label-xs text-label-xs font-semibold shadow-sm">
            {sitio.categoria}
          </span>
          <BotonFavorito sitioId={sitio.id} />
        </div>
        <div className="relative flex items-center gap-1.5 font-label-md text-label-md text-on-primary">
          <span className="material-symbols-outlined text-[18px] text-tertiary-fixed">location_on</span>
          <span>{sitio.municipio}</span>
          {sitio.distancia_km != null && <span className="opacity-90">· a {Number(sitio.distancia_km).toFixed(1)} km</span>}
        </div>
      </div>

      <div className="p-space-md flex-1 flex flex-col justify-between gap-space-sm">
        <div>
          <h3 className="font-title-lg text-title-lg text-primary font-bold group-hover:text-secondary transition-colors">{sitio.nombre}</h3>
          {sitio.total_resenas > 0 && (
            <div className="flex items-center gap-1.5 mt-0.5">
              <Estrellas valor={sitio.calificacion_promedio} tamano={16} />
              <span className="font-label-xs text-label-xs text-on-surface-variant">{sitio.calificacion_promedio} ({sitio.total_resenas})</span>
            </div>
          )}
          <p className="font-body-sm text-body-sm text-on-surface-variant mt-1.5 line-clamp-2">
            {sitio.descripcion || "Sin descripción disponible."}
          </p>
          {sitio.tipo_viaje && (
            <div className="flex flex-wrap gap-1.5 mt-3">
              {sitio.tipo_viaje.split(",").map((t) => (
                <span key={t} className="px-2 py-0.5 rounded bg-surface text-on-surface-variant font-label-xs text-label-xs">{t.trim()}</span>
              ))}
            </div>
          )}
        </div>

        <div className="pt-space-sm flex items-center justify-between">
          <div className="flex flex-col">
            <span className="font-label-xs text-label-xs text-on-surface-variant uppercase">Desde</span>
            <div className="flex items-baseline gap-1">
              <span className="font-title-lg text-title-lg font-bold text-primary">
                {gratis ? "Gratuito" : `$${Number(sitio.precio).toLocaleString("es-CO")}`}
              </span>
              {!gratis && <span className="font-body-sm text-body-sm text-on-surface-variant">COP</span>}
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => navigate(`/sitios/${sitio.id}`)}
              className="inline-flex items-center gap-1.5 px-3 py-2.5 rounded-xl bg-surface-container text-on-surface font-label-md text-label-md hover:bg-surface-container-high shadow-sm transition-all"
            >
              <span>Ver detalle</span>
              <span className="material-symbols-outlined text-[16px]">visibility</span>
            </button>
            {esAdmin ? (
              <button
                onClick={() => onInfo(sitio)}
                className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-surface-container text-primary font-label-md text-label-md hover:bg-surface-container-high shadow-sm transition-all"
              >
                <span>Más información</span>
                <span className="material-symbols-outlined text-[16px]">info</span>
              </button>
            ) : (
              <button
                onClick={() => onReservar(sitio)}
                className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-primary text-on-primary font-label-md text-label-md hover:bg-primary-container shadow-sm transition-all"
              >
                <span>Reservar</span>
                <span className="material-symbols-outlined text-[16px]">bookmark_added</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </article>
  );
}
