import { useEffect, useState } from "react";
import { api } from "../../api/client";
import { Estrellas } from "../Estrellas";
import { useAvisos } from "../../context/avisos";
import Boton from "../ui/Boton";
import Tarjeta from "../ui/Tarjeta";

function Resena({ resena, onRespondida }) {
  const [editando, setEditando] = useState(false);
  const { avisar } = useAvisos();
  const [texto, setTexto] = useState(resena.respuesta || "");
  const [guardando, setGuardando] = useState(false);

  const enviar = async (e) => {
    e.preventDefault();
    setGuardando(true);
    try {
      onRespondida(await api.responderResena(resena.id, texto));
      setEditando(false);
    } catch (err) {
      avisar(err.message);
    } finally {
      setGuardando(false);
    }
  };

  return (
    <article className="p-4 rounded-xl bg-surface-container-low flex flex-col gap-2">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="font-title-sm text-title-sm text-on-surface font-semibold">{resena.turista?.nombre || "Viajero"}</span>
          <Estrellas valor={resena.calificacion} tamano={16} />
          <span className="font-label-xs text-label-xs text-outline">{resena.Paquete ? `Paquete: ${resena.Paquete.nombre}` : resena.SitioTuristico?.nombre} · {new Date(resena.fecha).toLocaleDateString("es-CO")}</span>
        </div>
      </div>
      {resena.comentario && <p className="font-body-sm text-body-sm text-on-surface-variant">{resena.comentario}</p>}

      {!editando && resena.respuesta && (
        <div className="ml-4 pl-3 border-l-2 border-secondary">
          <p className="font-label-xs text-label-xs text-secondary font-semibold">Tu respuesta</p>
          <p className="font-body-sm text-body-sm text-on-surface">{resena.respuesta}</p>
        </div>
      )}
      {!editando && (
        <button onClick={() => setEditando(true)} className="self-start font-label-xs text-label-xs text-secondary font-semibold hover:underline">
          {resena.respuesta ? "Editar respuesta" : "Responder"}
        </button>
      )}
      {editando && (
        <form onSubmit={enviar} className="flex flex-col gap-2">
          <textarea
            required
            rows={3}
            maxLength={1000}
            autoFocus
            value={texto}
            onChange={(e) => setTexto(e.target.value)}
            placeholder="Agradece o aclara lo que comenta el viajero…"
            className="px-4 py-2.5 rounded-xl bg-surface-container-lowest border border-surface-container-high outline-none focus:border-secondary resize-none"
          />
          <div className="flex gap-2">
            <Boton variante="secundario" type="button" onClick={() => setEditando(false)} className="px-4 py-2">Cancelar</Boton>
            <Boton type="submit" disabled={guardando} className="px-4 py-2">
              {guardando ? "Enviando..." : "Publicar respuesta"}
            </Boton>
          </div>
        </form>
      )}
    </article>
  );
}

export default function ResenasRecibidas() {
  const [resenas, setResenas] = useState([]);

  useEffect(() => {
    api.resenasRecibidas().then(setResenas).catch(() => {});
  }, []);

  return (
    <Tarjeta as="section" id="resenas" className="w-full p-5 scroll-mt-24">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="font-title-lg text-title-lg text-on-surface font-semibold">Reseñas de tus servicios</h2>
          <p className="font-body-sm text-body-sm text-on-surface-variant">Responde a los viajeros que ya vivieron tu experiencia</p>
        </div>
        <span className="bg-surface-container px-3 py-1 rounded-lg font-label-xs text-label-xs text-primary font-semibold">{resenas.length} total</span>
      </div>
      {resenas.length === 0 ? (
        <p className="font-body-sm text-body-sm text-on-surface-variant">Aún no has recibido reseñas. Aparecerán cuando un turista califique una reserva cumplida.</p>
      ) : (
        <div className="flex flex-col gap-3">
          {resenas.map((r) => (
            <Resena key={r.id} resena={r} onRespondida={(act) => setResenas((prev) => prev.map((x) => (x.id === r.id ? { ...x, ...act } : x)))} />
          ))}
        </div>
      )}
    </Tarjeta>
  );
}
