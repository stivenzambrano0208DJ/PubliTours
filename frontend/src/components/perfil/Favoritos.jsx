import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api, urlImagen } from "../../api/client";
import { CATEGORIA_ICONOS } from "../../constants";
import { useFavoritos } from "../../context/favoritos";
import BotonFavorito from "../BotonFavorito";
import { Estrellas } from "../Estrellas";

export default function Favoritos() {
  const { ids } = useFavoritos();
  const [sitios, setSitios] = useState([]);
  const [cargando, setCargando] = useState(true);

  useEffect(() => {
    api.misFavoritos().then(setSitios).catch(() => {}).finally(() => setCargando(false));
  }, []);

  // Si se quita un corazón desde esta lista, la tarjeta desaparece.
  const visibles = sitios.filter((s) => ids.has(s.id));

  if (cargando) return <p className="font-body-md text-body-md text-on-surface-variant">Cargando favoritos...</p>;

  return (
    <section className="space-y-space-sm">
      <h2 className="font-headline-md text-headline-md text-on-surface font-bold">Mis favoritos</h2>
      {visibles.length === 0 ? (
        <div className="bg-surface-container-lowest rounded-2xl p-space-lg text-center">
          <p className="font-body-sm text-body-sm text-on-surface-variant">Aún no tienes favoritos. Toca el corazón en cualquier sitio para guardarlo aquí.</p>
          <Link to="/explorar" className="inline-block mt-3 px-5 py-2.5 rounded-xl bg-primary text-on-primary font-label-md text-label-md hover:bg-primary-container transition-colors">
            Explorar destinos
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-space-md">
          {visibles.map((s) => (
            <Link key={s.id} to={`/sitios/${s.id}`} className="group bg-surface-container-lowest rounded-2xl overflow-hidden shadow-sm hover:shadow-lg transition-all">
              <div
                className="relative h-36 bg-gradient-to-br from-primary-container to-secondary bg-cover bg-center flex items-center justify-center"
                style={s.imagen_url ? { backgroundImage: `url(${urlImagen(s.imagen_url)})` } : undefined}
              >
                {!s.imagen_url && <span className="material-symbols-outlined text-on-primary text-[36px] opacity-80">{CATEGORIA_ICONOS[s.categoria] || "place"}</span>}
                <BotonFavorito sitioId={s.id} className="absolute top-2 right-2" />
              </div>
              <div className="p-4 flex flex-col gap-1">
                <h3 className="font-title-sm text-title-sm text-primary font-bold group-hover:text-secondary transition-colors">{s.nombre}</h3>
                <span className="font-label-xs text-label-xs text-on-surface-variant">{s.municipio} · {s.categoria}</span>
                <div className="flex items-center justify-between mt-1">
                  <span className="font-title-sm text-title-sm text-primary font-semibold">
                    {Number(s.precio) === 0 ? "Gratuito" : `$${Number(s.precio).toLocaleString("es-CO")}`}
                  </span>
                  {s.total_resenas > 0 && (
                    <span className="inline-flex items-center gap-1 font-label-xs text-label-xs text-on-surface-variant">
                      <Estrellas valor={1} tamano={16} /> {s.calificacion_promedio} ({s.total_resenas})
                    </span>
                  )}
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </section>
  );
}
