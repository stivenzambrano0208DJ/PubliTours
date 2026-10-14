import { useState } from "react";
import { api } from "../../api/client";
import { CATEGORIAS_NEGOCIO, MUNICIPIOS_CAQUETA } from "../../constants";
import { requisitos } from "./requisitos";

const INPUT = "w-full px-4 py-2.5 rounded-xl bg-surface-container-low border border-surface-container-high outline-none focus:border-secondary";

const desde = (p) => ({
  nombre_negocio: p.nombre_negocio || "", categoria: p.categoria || "", municipio: p.municipio || "",
  descripcion: p.descripcion || "", telefono: p.telefono || "", direccion: p.direccion || "", redes: p.redes || "",
});

// Segunda etapa del registro: el prestador termina su perfil y lo envía a revisión del administrador.
export default function CompletarPerfil({ perfil, onActualizado }) {
  const [form, setForm] = useState(desde(perfil));
  const [guardando, setGuardando] = useState(false);
  const [enviando, setEnviando] = useState(false);
  const [mensaje, setMensaje] = useState(null);
  const rechazado = perfil.estado_verificacion === "rechazado";

  const lista = requisitos(form);
  const completos = lista.filter((r) => r.ok).length;
  const listo = completos === lista.length;
  const cambiar = (campo, v) => setForm((prev) => ({ ...prev, [campo]: v }));

  const guardar = async () => {
    const actualizado = await api.actualizarPerfilPrestador(perfil.id, form);
    onActualizado(actualizado);
    return actualizado;
  };

  const guardarBorrador = async (e) => {
    e.preventDefault();
    setGuardando(true);
    setMensaje(null);
    try {
      await guardar();
      setMensaje({ ok: true, texto: "Borrador guardado." });
    } catch (err) {
      setMensaje({ ok: false, texto: err.message });
    } finally {
      setGuardando(false);
    }
  };

  const enviar = async () => {
    setEnviando(true);
    setMensaje(null);
    try {
      await guardar();
      onActualizado(await api.enviarRevisionPrestador(perfil.id));
    } catch (err) {
      setMensaje({ ok: false, texto: err.message });
      setEnviando(false);
    }
  };

  return (
    <div className="max-w-[1100px] mx-auto px-gutter py-space-xl">
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        <form onSubmit={guardarBorrador} className="lg:col-span-8 bg-surface-container-lowest rounded-3xl p-6 sm:p-8 shadow-[0_10px_35px_-8px_rgba(0,0,0,0.08)] flex flex-col gap-5">
          <div>
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-secondary-container/40 text-secondary font-label-xs text-label-xs font-semibold mb-3">
              <span className="material-symbols-outlined text-[14px]">edit_note</span>
              {rechazado ? "Corrige tu perfil" : "Paso 2 de 2"}
            </span>
            <h1 className="font-headline-md text-headline-md text-primary tracking-tight">
              {rechazado ? "Corrige y vuelve a enviar tu negocio" : "Completa el perfil de tu negocio"}
            </h1>
            <p className="font-body-sm text-body-sm text-on-surface-variant mt-1">
              {rechazado
                ? "Ajusta lo que indicó el administrador y envíalo de nuevo a revisión."
                : "Cuando tu perfil esté completo podrás enviarlo a revisión. Hasta entonces el administrador no lo verá."}
            </p>
            {rechazado && perfil.motivo_rechazo && (
              <p className="mt-3 p-3 rounded-xl bg-error-container/50 text-on-surface font-body-sm text-body-sm flex items-start gap-2">
                <span className="material-symbols-outlined text-error text-[18px] shrink-0 mt-0.5">info</span>
                <span><strong>Motivo del rechazo:</strong> {perfil.motivo_rechazo}</span>
              </p>
            )}
          </div>

          <label className="flex flex-col gap-1.5">
            <span className="font-label-md text-label-md text-on-surface font-semibold">Nombre del negocio</span>
            <input className={INPUT} required maxLength={150} value={form.nombre_negocio} onChange={(e) => cambiar("nombre_negocio", e.target.value)} />
          </label>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <label className="flex flex-col gap-1.5">
              <span className="font-label-md text-label-md text-on-surface font-semibold">Categoría principal</span>
              <select className={INPUT} required value={form.categoria} onChange={(e) => cambiar("categoria", e.target.value)}>
                <option value="" disabled>Selecciona...</option>
                {CATEGORIAS_NEGOCIO.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}
              </select>
            </label>
            <label className="flex flex-col gap-1.5">
              <span className="font-label-md text-label-md text-on-surface font-semibold">Municipio de operación</span>
              <select className={INPUT} required value={form.municipio} onChange={(e) => cambiar("municipio", e.target.value)}>
                <option value="" disabled>Selecciona...</option>
                {MUNICIPIOS_CAQUETA.map((m) => <option key={m} value={m}>{m}</option>)}
              </select>
            </label>
          </div>

          <label className="flex flex-col gap-1.5">
            <span className="font-label-md text-label-md text-on-surface font-semibold">Descripción de tu negocio y experiencias</span>
            <textarea
              rows={4}
              maxLength={2000}
              className={`${INPUT} resize-none`}
              placeholder="Cuéntale al turista sobre tus senderos, tu gastronomía, tu hospedaje..."
              value={form.descripcion}
              onChange={(e) => cambiar("descripcion", e.target.value)}
            />
            <span className="font-label-xs text-label-xs text-on-surface-variant">{form.descripcion.trim().length} caracteres (mínimo 30)</span>
          </label>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <label className="flex flex-col gap-1.5">
              <span className="font-label-md text-label-md text-on-surface font-semibold">WhatsApp de contacto</span>
              <input
                type="tel"
                inputMode="numeric"
                className={INPUT}
                placeholder="Ej. 3001234567"
                value={form.telefono}
                onChange={(e) => cambiar("telefono", e.target.value.replace(/\D/g, ""))}
              />
            </label>
            <label className="flex flex-col gap-1.5">
              <span className="font-label-md text-label-md text-on-surface font-semibold">Redes o sitio web <span className="font-normal text-on-surface-variant">(opcional)</span></span>
              <input className={INPUT} maxLength={200} placeholder="Ej. instagram.com/mifinca" value={form.redes} onChange={(e) => cambiar("redes", e.target.value)} />
            </label>
          </div>

          <label className="flex flex-col gap-1.5">
            <span className="font-label-md text-label-md text-on-surface font-semibold">Dirección o cómo llegar</span>
            <input className={INPUT} maxLength={200} placeholder="Ej. Vereda El Caraño, km 4 vía a Morelia" value={form.direccion} onChange={(e) => cambiar("direccion", e.target.value)} />
          </label>

          {mensaje && <p className={`font-body-sm text-body-sm ${mensaje.ok ? "text-secondary" : "text-error"}`}>{mensaje.texto}</p>}

          <div className="flex flex-col-reverse sm:flex-row gap-3">
            <button type="submit" disabled={guardando || enviando} className="px-5 py-3 rounded-xl bg-surface-container text-on-surface font-label-md text-label-md hover:bg-surface-container-high transition-colors disabled:opacity-60">
              {guardando ? "Guardando..." : "Guardar borrador"}
            </button>
            <button
              type="button"
              onClick={enviar}
              disabled={!listo || enviando || guardando}
              className="flex-1 py-3 rounded-xl bg-primary text-on-primary font-title-sm text-title-sm hover:bg-primary-container transition-all disabled:opacity-50 flex items-center justify-center gap-2"
            >
              <span>{enviando ? "Enviando..." : rechazado ? "Enviar de nuevo a revisión" : "Enviar a revisión"}</span>
              {!enviando && <span className="material-symbols-outlined text-[18px]">send</span>}
            </button>
          </div>
        </form>

        <aside className="lg:col-span-4 flex flex-col gap-5">
          <div className="bg-surface-container-lowest rounded-2xl border border-surface-container-high p-5">
            <div className="flex items-center justify-between mb-2">
              <h2 className="font-title-sm text-title-sm text-primary font-bold">Tu avance</h2>
              <span className="font-label-md text-label-md text-secondary font-bold">{completos}/{lista.length}</span>
            </div>
            <div className="w-full h-2 rounded-full bg-surface-container-low overflow-hidden mb-4">
              <div className="h-full rounded-full bg-secondary transition-all" style={{ width: `${(completos / lista.length) * 100}%` }} />
            </div>
            <ul className="space-y-2.5">
              {lista.map((r) => (
                <li key={r.clave} className="flex items-start gap-2.5">
                  <span className={`material-symbols-outlined text-[18px] shrink-0 mt-0.5 ${r.ok ? "text-secondary" : "text-outline"}`}>{r.ok ? "check_circle" : "radio_button_unchecked"}</span>
                  <span className={`font-body-sm text-body-sm ${r.ok ? "text-on-surface" : "text-on-surface-variant"}`}>{r.texto}</span>
                </li>
              ))}
            </ul>
          </div>

          <div className="bg-surface-container-lowest rounded-2xl p-5">
            <h3 className="font-title-sm text-title-sm text-primary font-bold mb-3">¿Qué sigue?</h3>
            <ul className="space-y-3">
              <li className="flex items-start gap-2.5">
                <span className="material-symbols-outlined text-secondary text-[18px] shrink-0 mt-0.5">send</span>
                <span className="font-body-sm text-body-sm text-on-surface-variant">Envías tu perfil cuando esté completo.</span>
              </li>
              <li className="flex items-start gap-2.5">
                <span className="material-symbols-outlined text-secondary text-[18px] shrink-0 mt-0.5">hourglass_top</span>
                <span className="font-body-sm text-body-sm text-on-surface-variant">Un administrador lo revisa y te avisa por notificación.</span>
              </li>
              <li className="flex items-start gap-2.5">
                <span className="material-symbols-outlined text-secondary text-[18px] shrink-0 mt-0.5">verified</span>
                <span className="font-body-sm text-body-sm text-on-surface-variant">Si lo aprueba, podrás publicar servicios y paquetes.</span>
              </li>
            </ul>
          </div>
        </aside>
      </div>
    </div>
  );
}
