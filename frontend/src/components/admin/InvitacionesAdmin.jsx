import { useState } from "react";
import { api } from "../../api/client";
import { useConsulta } from "../../hooks/useConsulta";

const CAMPO = "px-4 py-2.5 rounded-xl bg-surface-container-low border border-surface-container-high outline-none focus:border-secondary font-body-sm text-body-sm";
const fecha = (iso) => new Date(iso).toLocaleDateString("es-CO", { day: "numeric", month: "short", year: "numeric" });

// Más oferta: la administración invita por correo a negocios de la región y ve cuáles ya se registraron.
export default function InvitacionesAdmin() {
  const [version, setVersion] = useState(0);
  const { datos: invitaciones, error, cargando } = useConsulta(`invitaciones-${version}`, () => api.invitacionesAdmin());
  const [form, setForm] = useState({ correo: "", nombre_negocio: "", mensaje: "" });
  const [enviando, setEnviando] = useState(false);
  const [resultado, setResultado] = useState(null); // { ok, texto }

  const enviar = async (e) => {
    e.preventDefault();
    setEnviando(true);
    setResultado(null);
    try {
      const invitacion = await api.invitarNegocioAdmin(form);
      setResultado({ ok: true, texto: `Invitación enviada a ${invitacion.correo}.` });
      setForm({ correo: "", nombre_negocio: "", mensaje: "" });
      setVersion((v) => v + 1);
    } catch (err) {
      setResultado({ ok: false, texto: err.message });
    } finally {
      setEnviando(false);
    }
  };

  const registradas = invitaciones?.filter((i) => i.como_negocio).length || 0;

  return (
    <section className="bg-surface-container-lowest rounded-2xl shadow-sm p-5 flex flex-col gap-5">
      <div>
        <h2 className="font-title-lg text-title-lg text-on-surface font-semibold">Invitar negocios</h2>
        <p className="font-body-sm text-body-sm text-on-surface-variant">
          Escríbele a un negocio de la región para que publique en PubliTours. Recibe un correo con el enlace para registrarse.
        </p>
      </div>

      <form onSubmit={enviar} className="grid gap-3 md:grid-cols-2">
        <label className="flex flex-col gap-1.5">
          <span className="font-label-md text-label-md text-on-surface font-semibold">Correo del negocio</span>
          <input type="email" required maxLength={150} value={form.correo} onChange={(e) => setForm({ ...form, correo: e.target.value })} className={CAMPO} placeholder="contacto@negocio.com" />
        </label>
        <label className="flex flex-col gap-1.5">
          <span className="font-label-md text-label-md text-on-surface font-semibold">Nombre del negocio <span className="font-normal text-on-surface-variant">(opcional)</span></span>
          <input maxLength={150} value={form.nombre_negocio} onChange={(e) => setForm({ ...form, nombre_negocio: e.target.value })} className={CAMPO} placeholder="Finca El Paraíso" />
        </label>
        <label className="flex flex-col gap-1.5 md:col-span-2">
          <span className="font-label-md text-label-md text-on-surface font-semibold">Mensaje personal <span className="font-normal text-on-surface-variant">(opcional)</span></span>
          <textarea rows={3} maxLength={500} value={form.mensaje} onChange={(e) => setForm({ ...form, mensaje: e.target.value })} className={`${CAMPO} resize-none`} placeholder="Ej. Nos encantó su cabalgata en el festival de San Vicente." />
        </label>
        <div className="md:col-span-2 flex flex-wrap items-center gap-3">
          <button type="submit" disabled={enviando} className="px-5 py-2.5 rounded-xl bg-primary text-on-primary font-label-md text-label-md font-semibold hover:bg-primary-container transition-colors disabled:opacity-60 flex items-center gap-2">
            <span className="material-symbols-outlined text-[18px]" aria-hidden="true">send</span>
            {enviando ? "Enviando..." : "Enviar invitación"}
          </button>
          {resultado && <p role={resultado.ok ? "status" : "alert"} className={`font-body-sm text-body-sm ${resultado.ok ? "text-secondary" : "text-error"}`}>{resultado.texto}</p>}
        </div>
      </form>

      <div className="flex flex-col gap-2">
        <h3 className="font-title-sm text-title-sm text-on-surface font-semibold">
          Invitaciones enviadas{invitaciones?.length ? ` · ${registradas} de ${invitaciones.length} ya se registraron como negocio` : ""}
        </h3>
        {cargando ? (
          <p role="status" className="font-body-sm text-body-sm text-on-surface-variant">Cargando…</p>
        ) : error ? (
          <p role="alert" className="font-body-sm text-body-sm text-error">{error}</p>
        ) : invitaciones.length === 0 ? (
          <p className="font-body-sm text-body-sm text-on-surface-variant">Aún no has invitado a ningún negocio.</p>
        ) : (
          <ul className="flex flex-col gap-2">
            {invitaciones.map((i) => (
              <li key={i.id} className="p-3 rounded-xl bg-surface-container-low flex flex-wrap items-center justify-between gap-2">
                <div className="min-w-0">
                  <p className="font-body-sm text-body-sm text-on-surface font-semibold truncate">{i.nombre_negocio || i.correo}</p>
                  <p className="font-label-xs text-label-xs text-on-surface-variant truncate">{i.nombre_negocio ? `${i.correo} · ` : ""}enviada el {fecha(i.enviada_en)}</p>
                </div>
                <span className={`px-2.5 py-0.5 rounded-full font-label-xs text-label-xs font-semibold ${i.como_negocio ? "bg-primary-fixed text-on-primary-fixed-variant" : i.registrado ? "bg-secondary-container text-on-secondary-container" : "bg-surface-container text-on-surface-variant"}`}>
                  {i.como_negocio ? "Registrado como negocio" : i.registrado ? "Se registró como turista" : "Sin registrarse"}
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}
