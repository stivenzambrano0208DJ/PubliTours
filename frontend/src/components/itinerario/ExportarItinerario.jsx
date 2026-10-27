import { useState } from "react";
import { api } from "../../api/client";
import { textoItinerario } from "../../utils/itinerario";

const BOTON = "inline-flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl bg-surface-container text-on-surface font-label-md text-label-md hover:bg-surface-container-high transition-colors disabled:opacity-60";

const urlDelPlan = (token) => `${window.location.origin}/plan/${token}`;

// Guardar el itinerario como PDF (el navegador imprime la versión limpia), compartirlo como texto o con un enlace público
// de solo lectura que la persona puede revocar cuando quiera.
export default function ExportarItinerario({ itinerario, fechaInicio, personas }) {
  const [aviso, setAviso] = useState("");
  const [token, setToken] = useState(itinerario.token_publico || null);
  const [trabajando, setTrabajando] = useState(false);

  const compartir = async () => {
    const text = textoItinerario({ itinerario, fechaInicio, personas });
    try {
      if (navigator.share) {
        await navigator.share({ title: "Mi itinerario en el Caquetá", text });
        return;
      }
      await navigator.clipboard.writeText(text);
      setAviso("Itinerario copiado. Pégalo donde quieras compartirlo.");
    } catch (err) {
      if (err?.name !== "AbortError") setAviso("No se pudo compartir desde este navegador."); // cancelar el diálogo no es un error
    }
  };

  const copiar = async (texto) => {
    try {
      await navigator.clipboard.writeText(texto);
      setAviso("Enlace copiado. Quien lo tenga podrá ver tu plan, sin iniciar sesión.");
    } catch {
      setAviso("No se pudo copiar automáticamente: selecciona el enlace y cópialo.");
    }
  };

  const crearEnlace = async () => {
    setTrabajando(true);
    setAviso("");
    try {
      const { token: nuevo } = await api.compartirItinerario(itinerario.id);
      setToken(nuevo);
      await copiar(urlDelPlan(nuevo));
    } catch (err) {
      setAviso(err.message);
    } finally {
      setTrabajando(false);
    }
  };

  const revocar = async () => {
    setTrabajando(true);
    setAviso("");
    try {
      await api.dejarDeCompartirItinerario(itinerario.id);
      setToken(null);
      setAviso("Dejaste de compartir el itinerario: el enlace anterior ya no funciona.");
    } catch (err) {
      setAviso(err.message);
    } finally {
      setTrabajando(false);
    }
  };

  return (
    <div className="flex flex-col gap-2 print:hidden">
      <div className="flex gap-2">
        <button type="button" onClick={() => window.print()} className={`flex-1 ${BOTON}`}>
          <span className="material-symbols-outlined text-[18px]" aria-hidden="true">picture_as_pdf</span> Guardar PDF
        </button>
        <button type="button" onClick={compartir} className={`flex-1 ${BOTON}`}>
          <span className="material-symbols-outlined text-[18px]" aria-hidden="true">share</span> Compartir
        </button>
      </div>

      {token ? (
        <div className="p-3 rounded-xl bg-surface-container-low flex flex-col gap-2">
          <label htmlFor="enlace-plan" className="font-label-xs text-label-xs text-on-surface-variant">Enlace público (solo lectura)</label>
          <input id="enlace-plan" readOnly value={urlDelPlan(token)} onFocus={(e) => e.target.select()} className="w-full px-3 py-2 rounded-lg bg-surface-container-lowest font-label-xs text-label-xs text-on-surface" />
          <div className="flex gap-2">
            <button type="button" onClick={() => copiar(urlDelPlan(token))} className={`flex-1 ${BOTON}`}>
              <span className="material-symbols-outlined text-[18px]" aria-hidden="true">content_copy</span> Copiar enlace
            </button>
            <button type="button" onClick={revocar} disabled={trabajando} className={`flex-1 ${BOTON} text-error`}>
              <span className="material-symbols-outlined text-[18px]" aria-hidden="true">link_off</span> Dejar de compartir
            </button>
          </div>
        </div>
      ) : (
        <button type="button" onClick={crearEnlace} disabled={trabajando} className={`w-full ${BOTON}`}>
          <span className="material-symbols-outlined text-[18px]" aria-hidden="true">link</span>
          {trabajando ? "Creando enlace…" : "Crear enlace para compartir"}
        </button>
      )}

      {aviso && <p role="status" className="font-label-xs text-label-xs text-on-surface-variant">{aviso}</p>}
    </div>
  );
}
