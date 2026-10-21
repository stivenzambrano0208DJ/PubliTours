import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AvisosContext } from "./avisos";

const MAX_AVISOS = 3; // si llegan más, se descartan los más antiguos
const DURACION_MS = { error: 9000, ok: 5000, info: 6000 };
const ESTILO = {
  error: { caja: "bg-error-container text-on-error-container", icono: "error", rol: "alert" },
  ok: { caja: "bg-inverse-surface text-inverse-on-surface", icono: "check_circle", rol: "status" },
  info: { caja: "bg-inverse-surface text-inverse-on-surface", icono: "info", rol: "status" },
};

function Aviso({ aviso, onCerrar }) {
  const estilo = ESTILO[aviso.tipo] || ESTILO.error;
  useEffect(() => {
    const t = setTimeout(() => onCerrar(aviso.id), DURACION_MS[aviso.tipo] || DURACION_MS.error);
    return () => clearTimeout(t);
  }, [aviso, onCerrar]);
  return (
    <div role={estilo.rol} className={`pointer-events-auto flex items-start gap-2.5 rounded-xl px-4 py-3 shadow-lg ${estilo.caja}`}>
      <span className="material-symbols-outlined text-[20px] shrink-0 mt-0.5" aria-hidden="true">{estilo.icono}</span>
      <p className="flex-1 font-body-sm text-body-sm">{aviso.mensaje}</p>
      <button type="button" onClick={() => onCerrar(aviso.id)} aria-label="Cerrar aviso" className="shrink-0 -mr-1 p-0.5 rounded-lg opacity-80 hover:opacity-100">
        <span className="material-symbols-outlined text-[18px]" aria-hidden="true">close</span>
      </button>
    </div>
  );
}

// Ventana de confirmación: el foco empieza en "Cancelar" (lo más seguro si la acción es irreversible), Escape o tocar fuera cancelan,
// Tab no sale de la ventana y al cerrarla el foco vuelve a donde estaba.
function Confirmacion({ pregunta, onResponder }) {
  const { mensaje, opciones } = pregunta;
  const botonCancelar = useRef(null);

  useEffect(() => {
    const anterior = document.activeElement;
    botonCancelar.current?.focus();
    return () => anterior?.focus?.();
  }, []);

  const alTeclear = (e) => {
    if (e.key === "Escape") { e.stopPropagation(); onResponder(false); return; }
    if (e.key !== "Tab") return;
    const botones = [...e.currentTarget.querySelectorAll("button")];
    const primero = botones[0];
    const ultimo = botones[botones.length - 1];
    if (e.shiftKey && document.activeElement === primero) { e.preventDefault(); ultimo.focus(); }
    else if (!e.shiftKey && document.activeElement === ultimo) { e.preventDefault(); primero.focus(); }
  };

  return (
    <div className="fixed inset-0 z-[100] bg-black/40 flex items-center justify-center p-4" onClick={() => onResponder(false)}>
      <div
        role="alertdialog" aria-modal="true" aria-labelledby="confirmacion-titulo" aria-describedby="confirmacion-texto"
        onClick={(e) => e.stopPropagation()} onKeyDown={alTeclear}
        className="w-full max-w-sm bg-surface-container-lowest rounded-2xl p-6 shadow-xl flex flex-col gap-4"
      >
        <div className="flex flex-col gap-2">
          <h2 id="confirmacion-titulo" className="font-title-lg text-title-lg text-on-surface font-semibold">{opciones.titulo || "¿Confirmas?"}</h2>
          <p id="confirmacion-texto" className="font-body-md text-body-md text-on-surface-variant">{mensaje}</p>
        </div>
        <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-2">
          <button
            ref={botonCancelar} type="button" onClick={() => onResponder(false)}
            className="px-4 py-2.5 rounded-xl bg-surface-container text-on-surface font-label-md text-label-md font-semibold hover:bg-surface-container-high transition-colors"
          >
            {opciones.cancelar || "Cancelar"}
          </button>
          <button
            type="button" onClick={() => onResponder(true)}
            className={`px-4 py-2.5 rounded-xl font-label-md text-label-md font-semibold transition-colors ${opciones.peligro ? "bg-error text-on-error hover:opacity-90" : "bg-primary text-on-primary hover:bg-primary-container"}`}
          >
            {opciones.confirmar || "Confirmar"}
          </button>
        </div>
      </div>
    </div>
  );
}

export function AvisosProvider({ children }) {
  const [avisos, setAvisos] = useState([]);
  const [pregunta, setPregunta] = useState(null);
  const resolverPregunta = useRef(null);
  const siguienteId = useRef(0);

  const quitar = useCallback((id) => setAvisos((actuales) => actuales.filter((a) => a.id !== id)), []);

  const avisar = useCallback((mensaje, tipo = "error") => {
    const id = ++siguienteId.current;
    setAvisos((actuales) => [...actuales.slice(-(MAX_AVISOS - 1)), { id, mensaje, tipo }]);
  }, []);

  const confirmar = useCallback((mensaje, opciones = {}) => new Promise((resolver) => {
    resolverPregunta.current?.(false); // si ya había una pregunta abierta, queda cancelada
    resolverPregunta.current = resolver;
    setPregunta({ mensaje, opciones });
  }), []);

  const responder = useCallback((respuesta) => {
    resolverPregunta.current?.(respuesta);
    resolverPregunta.current = null;
    setPregunta(null);
  }, []);

  const valor = useMemo(() => ({ avisar, confirmar }), [avisar, confirmar]);

  return (
    <AvisosContext.Provider value={valor}>
      {children}
      <div className="fixed z-[110] bottom-4 inset-x-4 sm:inset-x-auto sm:right-4 sm:w-96 flex flex-col gap-2 pointer-events-none" aria-live="polite">
        {avisos.map((a) => <Aviso key={a.id} aviso={a} onCerrar={quitar} />)}
      </div>
      {pregunta && <Confirmacion pregunta={pregunta} onResponder={responder} />}
    </AvisosContext.Provider>
  );
}
