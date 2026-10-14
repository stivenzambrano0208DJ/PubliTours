import { useEffect, useState } from "react";
import { api } from "../api/client";
import { Estrellas } from "./Estrellas";

// Reseñas reales de turistas que ya vivieron la experiencia (solo con reserva confirmada y cumplida).
export default function ResenasSitio({ sitioId, paqueteId }) {
  const [datos, setDatos] = useState(null);

  useEffect(() => {
    (paqueteId ? api.resenasPaquete(paqueteId) : api.resenasSitio(sitioId))
      .then(setDatos)
      .catch(() => setDatos({ total: 0, promedio: null, resenas: [] }));
  }, [sitioId, paqueteId]);

  if (!datos) return null;

  return (
    <section className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center gap-3">
        <h2 className="font-headline-md text-headline-md text-primary font-bold">Reseñas de viajeros</h2>
        {datos.total > 0 && (
          <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-surface-container font-label-md text-label-md text-on-surface font-semibold">
            <Estrellas valor={datos.promedio} tamano={18} /> {datos.promedio} · {datos.total} reseña(s)
          </span>
        )}
      </div>

      {datos.total === 0 ? (
        <p className="font-body-sm text-body-sm text-on-surface-variant p-4 rounded-2xl bg-surface-container-low">
          Aún no hay reseñas. Solo pueden calificar quienes reservaron {paqueteId ? "este paquete" : "este servicio"} y ya lo vivieron.
        </p>
      ) : (
        <div className="flex flex-col gap-3">
          {datos.resenas.map((r) => (
            <article key={r.id} className="p-4 rounded-2xl bg-surface-container-low flex flex-col gap-1.5">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <span className="w-8 h-8 rounded-full bg-primary-container text-on-primary flex items-center justify-center font-label-md text-label-md font-bold">
                    {r.turista?.nombre?.charAt(0).toUpperCase() || "?"}
                  </span>
                  <span className="font-title-sm text-title-sm text-on-surface font-semibold">{r.turista?.nombre || "Viajero"}</span>
                </div>
                <span className="font-label-xs text-label-xs text-outline">{new Date(r.fecha).toLocaleDateString("es-CO")}</span>
              </div>
              <Estrellas valor={r.calificacion} tamano={16} />
              {r.comentario && <p className="font-body-sm text-body-sm text-on-surface-variant">{r.comentario}</p>}
              {r.respuesta && (
                <div className="mt-1 ml-3 pl-3 border-l-2 border-secondary">
                  <p className="font-label-xs text-label-xs text-secondary font-semibold">Respuesta del prestador</p>
                  <p className="font-body-sm text-body-sm text-on-surface">{r.respuesta}</p>
                </div>
              )}
            </article>
          ))}
        </div>
      )}
    </section>
  );
}
