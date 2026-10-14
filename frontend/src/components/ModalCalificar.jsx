import { useState } from "react";
import { api } from "../api/client";
import { SelectorEstrellas } from "./Estrellas";

const ETIQUETAS = ["", "Muy malo", "Malo", "Regular", "Bueno", "Excelente"];

export default function ModalCalificar({ reserva, onCerrar, onGuardado }) {
  const [calificacion, setCalificacion] = useState(0);
  const [comentario, setComentario] = useState("");
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState("");

  const enviar = async (e) => {
    e.preventDefault();
    if (!calificacion) { setError("Elige de 1 a 5 estrellas."); return; }
    setGuardando(true);
    setError("");
    try {
      const resena = await api.calificarReserva(reserva.id, { calificacion, comentario });
      onGuardado(resena);
    } catch (err) {
      setError(err.message);
    } finally {
      setGuardando(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/40 z-[60] flex items-center justify-center p-4" onClick={onCerrar}>
      <form onClick={(e) => e.stopPropagation()} onSubmit={enviar} className="w-full max-w-md bg-surface-container-lowest rounded-2xl p-6 shadow-xl flex flex-col gap-4">
        <div>
          <h3 className="font-headline-md text-headline-md text-primary">Califica tu experiencia</h3>
          <p className="font-body-sm text-body-sm text-on-surface-variant mt-1">{reserva.paquete?.nombre || reserva.sitio?.nombre} · {reserva.fecha_servicio}</p>
        </div>
        <div className="flex flex-col items-center gap-1">
          <SelectorEstrellas valor={calificacion} onChange={setCalificacion} />
          <span className="font-label-md text-label-md text-secondary font-semibold h-5">{ETIQUETAS[calificacion]}</span>
        </div>
        <textarea
          rows={4}
          maxLength={1000}
          className="px-4 py-2.5 rounded-xl bg-surface-container-low border border-surface-container-high outline-none focus:border-secondary resize-none"
          placeholder="Cuéntanos cómo te fue (opcional)"
          value={comentario}
          onChange={(e) => setComentario(e.target.value)}
        />
        {error && <p className="text-error font-body-sm text-body-sm">{error}</p>}
        <div className="flex items-center gap-2">
          <button type="button" onClick={onCerrar} className="flex-1 py-2.5 rounded-xl bg-surface-container text-on-surface font-label-md text-label-md hover:bg-surface-container-high transition-colors">
            Cancelar
          </button>
          <button type="submit" disabled={guardando} className="flex-1 py-2.5 rounded-xl bg-primary text-on-primary font-label-md text-label-md hover:bg-primary-container transition-colors disabled:opacity-60">
            {guardando ? "Enviando..." : "Enviar calificación"}
          </button>
        </div>
      </form>
    </div>
  );
}
