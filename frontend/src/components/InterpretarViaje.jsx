import { useState } from "react";
import { api } from "../api/client";

const EJEMPLOS = [
  { icono: "favorite", texto: "Escapada romántica de 3 días en Florencia con 500 mil pesos" },
  { icono: "family_restroom", texto: "Fin de semana en familia con cascadas, presupuesto de $400.000" },
  { icono: "hiking", texto: "5 días de aventura y naturaleza con 1.200.000" },
];
const MAXIMO = 600;
const MINIMO = 5;

// Cuadro de lenguaje natural: la IA solo interpreta; el turista revisa los campos y confirma antes de generar.
export default function InterpretarViaje({ onResultado }) {
  const [texto, setTexto] = useState("");
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState("");
  const [resultado, setResultado] = useState(null);

  const interpretar = async (e) => {
    e.preventDefault();
    setCargando(true);
    setError("");
    try {
      const r = await api.interpretarViaje(texto);
      setResultado(r);
      onResultado(r);
    } catch (err) {
      setResultado(null);
      setError(err.message);
    } finally {
      setCargando(false);
    }
  };

  const enviar = (e) => {
    if ((e.ctrlKey || e.metaKey) && e.key === "Enter" && !cargando && texto.trim().length >= MINIMO) interpretar(e);
  };

  const faltantes = resultado ? [!resultado.presupuesto && "el presupuesto", !resultado.dias && "los días"].filter(Boolean) : [];

  return (
    <section className="p-space-lg rounded-2xl bg-gradient-to-br from-primary-container to-secondary text-on-primary shadow-lg mb-space-md">
      <div className="flex items-center gap-2 mb-1">
        <span className="material-symbols-outlined text-tertiary-fixed text-[22px]">auto_awesome</span>
        <h2 className="font-title-lg text-title-lg font-bold">Cuéntanos tu viaje</h2>
      </div>
      <p className="font-body-sm text-body-sm text-on-primary/85 mb-3">
        Escríbelo como se lo dirías a un amigo. Entendemos tu presupuesto, los días y tus intereses, y rellenamos el formulario por ti.
      </p>

      <form onSubmit={interpretar} className="flex flex-col gap-2">
        <label htmlFor="texto-viaje" className="sr-only">Describe tu viaje</label>
        <textarea
          id="texto-viaje"
          rows={4}
          maxLength={MAXIMO}
          required
          value={texto}
          onChange={(e) => setTexto(e.target.value)}
          onKeyDown={enviar}
          placeholder="Ej. Quiero un viaje romántico de 3 días en Florencia con 500 mil pesos"
          className="w-full px-4 py-3 rounded-xl bg-surface-container-lowest text-on-surface placeholder:text-outline focus:outline-none focus:ring-2 focus:ring-tertiary-fixed resize-none"
        />
        <div className="flex items-center justify-between gap-2 px-1 font-label-xs text-label-xs text-on-primary/80">
          <span>{texto.trim().length < MINIMO ? `Escribe al menos ${MINIMO} caracteres` : "Listo para interpretar (Ctrl + Enter)"}</span>
          <span aria-live="off">{texto.length}/{MAXIMO}</span>
        </div>
        <div>
          <p className="font-label-xs text-label-xs text-on-primary/80 mb-1.5">¿Sin ideas? Prueba con uno de estos:</p>
          <div className="flex flex-col sm:flex-row sm:flex-wrap gap-2">
            {EJEMPLOS.map((e) => (
              <button
                key={e.texto}
                type="button"
                onClick={() => setTexto(e.texto)}
                className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/15 hover:bg-white/25 focus:outline-none focus:ring-2 focus:ring-tertiary-fixed font-label-xs text-label-xs transition-colors text-left"
              >
                <span className="material-symbols-outlined text-[16px] text-tertiary-fixed" aria-hidden="true">{e.icono}</span>
                {e.texto}
              </button>
            ))}
          </div>
        </div>
        <button
          type="submit"
          disabled={cargando || texto.trim().length < MINIMO}
          className="mt-2 inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-surface-container-lowest text-primary font-label-md text-label-md font-bold shadow-sm hover:bg-white hover:shadow-md active:scale-[0.99] disabled:bg-white/25 disabled:text-on-primary disabled:shadow-none disabled:cursor-not-allowed transition-all sm:self-start"
        >
          <span className="material-symbols-outlined text-[18px] text-secondary" aria-hidden="true">{cargando ? "hourglass_top" : "auto_awesome"}</span>
          {cargando ? "Interpretando..." : "Interpretar mi viaje"}
        </button>
      </form>

      {error && <p className="mt-3 p-3 rounded-xl bg-error-container text-on-error-container font-body-sm text-body-sm">{error}</p>}

      {resultado && (
        <div className="mt-3 p-3 rounded-xl bg-white/15 flex flex-col gap-1.5" role="status">
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-label-md text-label-md font-semibold">Esto entendimos:</span>
            <span className="px-2 py-0.5 rounded-full bg-white/20 font-label-xs text-label-xs">
              {resultado.modo === "ia" ? "Interpretado con IA (Claude)" : "Interpretación básica"}
            </span>
          </div>
          <p className="font-body-md text-body-md">{resultado.resumen || "No detectamos datos concretos en tu mensaje."}</p>
          {faltantes.length > 0 && (
            <p className="font-body-sm text-body-sm text-tertiary-fixed">
              No detectamos {faltantes.join(" ni ")}: complétalo en el formulario de abajo.
            </p>
          )}
          <p className="font-label-xs text-label-xs text-on-primary/80">Revisa los campos y ajusta lo que quieras antes de generar tu itinerario.</p>
        </div>
      )}
    </section>
  );
}
