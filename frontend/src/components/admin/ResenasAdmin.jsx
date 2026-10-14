import { useEffect, useState } from "react";
import { api } from "../../api/client";
import { Estrellas } from "../Estrellas";

export default function ResenasAdmin() {
  const [resenas, setResenas] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [eliminando, setEliminando] = useState(null);

  useEffect(() => {
    api.resenasAdmin().then(setResenas).catch(() => {}).finally(() => setCargando(false));
  }, []);

  const eliminar = async (r) => {
    if (!window.confirm("¿Retirar esta reseña? Su autor recibirá un aviso y no se puede deshacer.")) return;
    setEliminando(r.id);
    try {
      await api.eliminarResenaAdmin(r.id);
      setResenas((prev) => prev.filter((x) => x.id !== r.id));
    } catch (err) {
      alert(err.message);
    } finally {
      setEliminando(null);
    }
  };

  return (
    <section className="bg-surface-container-lowest rounded-2xl shadow-sm p-5">
      <h2 className="font-title-lg text-title-lg text-on-surface font-semibold">Moderación de reseñas</h2>
      <p className="font-body-sm text-body-sm text-on-surface-variant mb-4">Retira reseñas ofensivas, falsas o que no correspondan al servicio.</p>
      {cargando ? (
        <p className="font-body-sm text-body-sm text-on-surface-variant">Cargando...</p>
      ) : resenas.length === 0 ? (
        <p className="font-body-sm text-body-sm text-on-surface-variant">Aún no hay reseñas en la plataforma.</p>
      ) : (
        <div className="flex flex-col gap-3">
          {resenas.map((r) => (
            <article key={r.id} className="p-4 rounded-xl bg-surface-container-low flex flex-col sm:flex-row sm:items-start justify-between gap-3">
              <div className="flex flex-col gap-1 min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-title-sm text-title-sm text-on-surface font-semibold">{r.turista?.nombre}</span>
                  <span className="font-label-xs text-label-xs text-outline">{r.turista?.correo}</span>
                  <Estrellas valor={r.calificacion} tamano={16} />
                </div>
                <span className="font-label-xs text-label-xs text-secondary font-semibold">{r.Paquete ? `Paquete: ${r.Paquete.nombre}` : r.SitioTuristico?.nombre} · {new Date(r.fecha).toLocaleDateString("es-CO")}</span>
                {r.comentario ? <p className="font-body-sm text-body-sm text-on-surface-variant">{r.comentario}</p> : <p className="font-body-sm text-body-sm text-outline italic">Sin comentario</p>}
                {r.respuesta && <p className="font-body-sm text-body-sm text-on-surface-variant border-l-2 border-secondary pl-2 mt-1">Respuesta del prestador: {r.respuesta}</p>}
              </div>
              <button
                onClick={() => eliminar(r)}
                disabled={eliminando === r.id}
                className="shrink-0 self-start px-3 py-2 rounded-xl bg-surface-container text-error font-label-xs text-label-xs font-semibold hover:bg-error-container transition-colors disabled:opacity-50"
              >
                Retirar reseña
              </button>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}
