import { useState } from "react";
import { api } from "../../api/client";
import Boton from "../ui/Boton";
import Tarjeta from "../ui/Tarjeta";

const MAX = 500;

// Anuncio a los prestadores: les llega como notificación dentro de la plataforma.
export default function AnunciosAdmin() {
  const [mensaje, setMensaje] = useState("");
  const [destinatarios, setDestinatarios] = useState("aprobados");
  const [enviando, setEnviando] = useState(false);
  const [estado, setEstado] = useState(null);

  const enviar = async (e) => {
    e.preventDefault();
    setEnviando(true);
    setEstado(null);
    try {
      const { enviados } = await api.enviarAnuncio({ mensaje: mensaje.trim(), destinatarios });
      setMensaje("");
      setEstado({ ok: true, texto: `Anuncio enviado a ${enviados} negocio${enviados === 1 ? "" : "s"}.` });
    } catch (err) {
      setEstado({ ok: false, texto: err.message });
    } finally {
      setEnviando(false);
    }
  };

  return (
    <Tarjeta as="section" className="p-5 max-w-2xl">
      <h2 className="font-title-lg text-title-lg text-on-surface font-semibold">Anuncios a prestadores</h2>
      <p className="font-body-sm text-body-sm text-on-surface-variant mb-4">Avisos generales (mantenimiento, cambios de reglas, novedades). Aparecen en la campana de notificaciones de cada negocio.</p>
      <form onSubmit={enviar} className="flex flex-col gap-4">
        <fieldset className="flex flex-col gap-2">
          <legend className="font-label-md text-label-md text-on-surface font-semibold mb-1">¿A quién va dirigido?</legend>
          {[["aprobados", "Solo negocios aprobados"], ["todos", "Todos los negocios (incluye los que aún no están aprobados)"]].map(([valor, texto]) => (
            <label key={valor} className="flex items-center gap-2 font-body-md text-body-md">
              <input type="radio" name="destinatarios" value={valor} checked={destinatarios === valor} onChange={() => setDestinatarios(valor)} />
              {texto}
            </label>
          ))}
        </fieldset>
        <label className="flex flex-col gap-1.5">
          <span className="font-label-md text-label-md text-on-surface font-semibold">Mensaje</span>
          <textarea
            rows={4} maxLength={MAX} required minLength={10} value={mensaje} onChange={(e) => setMensaje(e.target.value)}
            placeholder="Ej. Mañana de 2 a 4 a. m. la plataforma estará en mantenimiento."
            className="px-4 py-2.5 rounded-xl bg-surface-container-low border border-surface-container-high outline-none focus:border-secondary resize-none"
          />
          <span className="font-label-xs text-label-xs text-outline self-end">{mensaje.length}/{MAX}</span>
        </label>
        {estado && <p role={estado.ok ? "status" : "alert"} className={`font-body-sm text-body-sm ${estado.ok ? "text-secondary" : "text-error"}`}>{estado.texto}</p>}
        <Boton type="submit" disabled={enviando || mensaje.trim().length < 10} className="self-start inline-flex items-center gap-2 px-5 py-2.5">
          <span className="material-symbols-outlined text-[18px]">campaign</span>
          {enviando ? "Enviando..." : "Enviar anuncio"}
        </Boton>
      </form>
    </Tarjeta>
  );
}
