import { Fragment, useEffect, useRef, useState } from "react";
import { useHilo } from "../../hooks/useHilo";
import { etiquetaDia, mismoDia } from "../../utils/tiempo";
import BurbujaMensaje from "./BurbujaMensaje";
import RedactorMensaje from "./RedactorMensaje";
import VisorFoto from "./VisorFoto";
import ModalReportar from "./ModalReportar";

// Una conversación abierta: mensajes agrupados por día, caja para responder y las acciones de ver foto y reportar.
// Se monta con key = id para que cada conversación empiece con su propio estado.
export default function HiloConversacion({ id, onVolver }) {
  const { cargando, error, mensajes, enviar, cargarAnteriores, lado, contraparte, puedeEscribir, hayMas } = useHilo(id);
  const [foto, setFoto] = useState(null);
  const [reportando, setReportando] = useState(null);
  const [cargandoMas, setCargandoMas] = useState(false);
  const lista = useRef(null);
  const ultimoVisto = useRef(0);

  // Al llegar mensajes nuevos se baja hasta el final, salvo que la persona esté leyendo mensajes viejos más arriba.
  const ultimoId = mensajes.at(-1)?.id ?? 0;
  const ultimoEsMio = mensajes.at(-1)?.mio;
  useEffect(() => {
    const caja = lista.current;
    if (!caja || ultimoId === ultimoVisto.current) return;
    const primera = ultimoVisto.current === 0;
    const cercaDelFinal = caja.scrollHeight - caja.scrollTop - caja.clientHeight < 160;
    if (primera || cercaDelFinal || ultimoEsMio) caja.scrollTop = caja.scrollHeight;
    ultimoVisto.current = ultimoId;
  }, [ultimoId, ultimoEsMio]);

  const verMas = async () => {
    setCargandoMas(true);
    try { await cargarAnteriores(); } finally { setCargandoMas(false); }
  };

  if (cargando) return <p role="status" className="p-space-lg text-on-surface-variant">Cargando conversación…</p>;
  if (error) {
    return (
      <div className="p-space-lg flex flex-col gap-3 items-start">
        <p role="alert" className="text-error font-body-md text-body-md">{error}</p>
        <button type="button" onClick={onVolver} className="px-4 py-2 rounded-xl bg-surface-container text-on-surface font-label-md text-label-md">Volver a mis mensajes</button>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full min-h-0">
      <header className="flex items-center gap-3 px-4 py-3 border-b border-surface-container-high">
        <button type="button" onClick={onVolver} aria-label="Volver a mis mensajes" className="lg:hidden w-9 h-9 rounded-full hover:bg-surface-container flex items-center justify-center">
          <span className="material-symbols-outlined" aria-hidden="true">arrow_back</span>
        </button>
        <div className="w-10 h-10 rounded-full bg-primary-container text-on-primary flex items-center justify-center font-bold shrink-0" aria-hidden="true">
          {contraparte.nombre.charAt(0).toUpperCase()}
        </div>
        <div className="min-w-0">
          <h2 className="font-title-sm text-title-sm text-on-surface font-semibold truncate">{contraparte.nombre}</h2>
          <p className="font-label-xs text-label-xs text-on-surface-variant">{lado === "turista" ? "Negocio" : "Cliente"}</p>
        </div>
      </header>

      <div ref={lista} className="flex-1 min-h-0 overflow-y-auto px-4 py-4 flex flex-col gap-2" aria-live="polite" aria-label="Mensajes">
        {hayMas && (
          <button type="button" onClick={verMas} disabled={cargandoMas} className="self-center px-3 py-1.5 rounded-full bg-surface-container text-on-surface-variant font-label-xs text-label-xs hover:bg-surface-container-high disabled:opacity-60">
            {cargandoMas ? "Cargando…" : "Ver mensajes anteriores"}
          </button>
        )}
        {mensajes.map((m, i) => (
          <Fragment key={m.id}>
            {(i === 0 || !mismoDia(mensajes[i - 1].creado_en, m.creado_en)) && (
              <p className="self-center my-1 px-3 py-0.5 rounded-full bg-surface-container font-label-xs text-label-xs text-on-surface-variant">{etiquetaDia(m.creado_en)}</p>
            )}
            <BurbujaMensaje mensaje={m} lado={lado} onVerFoto={setFoto} onReportar={setReportando} />
          </Fragment>
        ))}
      </div>

      <footer className="px-4 py-3 border-t border-surface-container-high">
        {puedeEscribir ? (
          <RedactorMensaje onEnviar={enviar} placeholder={lado === "negocio" ? "Escribe tu respuesta…" : "Escribe tu mensaje…"} />
        ) : (
          <p role="status" className="font-body-sm text-body-sm text-on-surface-variant">Este negocio no está disponible por el momento, así que no se pueden enviar mensajes nuevos.</p>
        )}
      </footer>

      {foto && <VisorFoto imagenId={foto} onCerrar={() => setFoto(null)} />}
      {reportando && <ModalReportar mensaje={reportando} onCerrar={() => setReportando(null)} />}
    </div>
  );
}
