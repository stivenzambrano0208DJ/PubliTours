import { useEffect, useState } from "react";
import { api } from "../../api/client";
import { fechaMinima } from "../../constants";
import { CAMPO_COMPACTO } from "../../estilos";


// El prestador marca los días en que no atiende un servicio; los turistas no podrán reservarlos.
export default function FechasBloqueadas({ sitioId }) {
  const [fechas, setFechas] = useState([]);
  const [fecha, setFecha] = useState("");
  const [motivo, setMotivo] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    api.fechasBloqueadas(sitioId).then(setFechas).catch(() => {});
  }, [sitioId]);

  const agregar = async () => {
    if (!fecha) return;
    setError("");
    try {
      const nueva = await api.bloquearFecha(sitioId, { fecha, motivo });
      setFechas((prev) => [...prev.filter((f) => f.id !== nueva.id), nueva].sort((a, b) => a.fecha.localeCompare(b.fecha)));
      setFecha("");
      setMotivo("");
    } catch (err) {
      setError(err.message);
    }
  };

  const quitar = async (id) => {
    await api.desbloquearFecha(sitioId, id).catch((err) => setError(err.message));
    setFechas((prev) => prev.filter((f) => f.id !== id));
  };

  return (
    <div className="flex flex-col gap-1.5">
      <span className="font-label-md text-label-md text-on-surface font-semibold">Días que no atiendes</span>
      <div className="flex flex-wrap gap-2">
        <input type="date" min={fechaMinima()} className={CAMPO_COMPACTO} value={fecha} onChange={(e) => setFecha(e.target.value)} />
        <input className={`${CAMPO_COMPACTO} flex-1 min-w-[120px]`} placeholder="Motivo (opcional; lo ven los turistas)" maxLength={150} value={motivo} onChange={(e) => setMotivo(e.target.value)} />
        <button type="button" onClick={agregar} disabled={!fecha} className="px-3 py-2 rounded-xl bg-surface-container text-on-surface font-label-md text-label-md hover:bg-surface-container-high disabled:opacity-50 transition-colors">
          Bloquear
        </button>
      </div>
      {error && <p className="text-error font-body-sm text-body-sm">{error}</p>}
      {fechas.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {fechas.map((f) => (
            <span key={f.id} className="inline-flex items-center gap-1 pl-2.5 pr-1 py-1 rounded-full bg-surface-container font-label-xs text-label-xs text-on-surface">
              {f.fecha}{f.motivo ? ` · ${f.motivo}` : ""}
              <button type="button" onClick={() => quitar(f.id)} aria-label="Desbloquear" className="w-5 h-5 rounded-full hover:bg-surface-container-high flex items-center justify-center">
                <span className="material-symbols-outlined text-[14px]">close</span>
              </button>
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
