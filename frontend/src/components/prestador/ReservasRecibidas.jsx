import { useState } from "react";
import CalendarioReservas from "./CalendarioReservas";
import EscanerAsistencia from "./EscanerAsistencia";
import { useConfiguracion } from "../../hooks/useConfiguracion";
import { sumarDias, hoyISO } from "../../utils/fechas";



export default function ReservasRecibidas({ reservas, cargando, accionando, onAccion }) {
  const [rechazando, setRechazando] = useState(null);
  const [motivo, setMotivo] = useState("");
  const [vista, setVista] = useState("lista");
  const [escaneando, setEscaneando] = useState(false);
  const gracia = useConfiguracion()?.dias_gracia_asistencia;

  const registrar = (r, accion) => {
    if (accion === "no_asistio" && !window.confirm(`¿Registrar que ${r.turista?.nombre || "el turista"} NO asistió? Es definitivo: no contará como ingreso ni podrá calificar.`)) return;
    onAccion(r.id, accion);
  };

  const confirmarRechazo = async (e) => {
    e.preventDefault();
    await onAccion(rechazando.id, "rechazar", motivo.trim());
    setRechazando(null);
    setMotivo("");
  };

  return (
    <section id="reservas" className="w-full bg-surface-container-lowest rounded-2xl p-5 shadow-sm scroll-mt-24">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="font-title-lg text-title-lg text-on-surface font-semibold">Reservas recibidas</h2>
          <p className="font-body-sm text-body-sm text-on-surface-variant">Solicitudes de turistas sobre tus servicios</p>
        </div>
        <div className="flex flex-wrap items-center justify-end gap-3">
          <button
            type="button" onClick={() => setEscaneando(true)}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-primary text-on-primary font-label-xs text-label-xs font-semibold hover:bg-secondary transition-colors"
          >
            <span className="material-symbols-outlined text-[18px]" aria-hidden="true">qr_code_scanner</span>Escanear QR
          </button>
          <div role="group" aria-label="Vista de reservas" className="flex p-1 rounded-xl bg-surface-container">
            {[["lista", "Lista", "view_list"], ["calendario", "Calendario", "calendar_month"]].map(([clave, texto, icono]) => (
              <button
                key={clave} type="button" aria-pressed={vista === clave} onClick={() => setVista(clave)}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-label-xs text-label-xs font-semibold transition-colors ${vista === clave ? "bg-primary text-on-primary" : "text-on-surface-variant hover:bg-surface-container-high"}`}
              >
                <span className="material-symbols-outlined text-[16px]">{icono}</span>{texto}
              </button>
            ))}
          </div>
          <span className="bg-surface-container px-3 py-1 rounded-lg font-label-xs text-label-xs text-primary font-semibold">{reservas.length} total</span>
        </div>
      </div>

      {escaneando && <EscanerAsistencia reservas={reservas} accionando={accionando} onAccion={onAccion} onCerrar={() => setEscaneando(false)} />}

      {vista === "calendario" && <CalendarioReservas reservas={reservas} />}

      {vista === "lista" && !cargando && reservas.length === 0 && (
        <p className="font-body-sm text-body-sm text-on-surface-variant">Aún no has recibido solicitudes de reserva.</p>
      )}

      <div className={`flex flex-col gap-3 ${vista === "calendario" ? "hidden" : ""}`}>
        {reservas.map((r) => (
          <div key={r.id} className="p-4 rounded-xl bg-surface-container-low flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-primary text-on-primary flex items-center justify-center font-bold text-label-md shrink-0">
                {r.turista?.nombre?.charAt(0).toUpperCase() || "?"}
              </div>
              <div className="flex flex-col">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-title-sm text-title-sm text-on-surface font-semibold">{r.turista?.nombre || "Turista"}</span>
                  <span className="bg-surface-container text-on-surface-variant font-label-xs text-label-xs px-2 py-0.5 rounded-full font-semibold">{r.fecha_servicio}</span>
                </div>
                <div className="flex flex-wrap items-center gap-1.5 text-on-surface-variant font-body-sm text-body-sm mt-0.5">
                  <span>{r.paquete ? <><span className="font-label-xs text-label-xs text-secondary font-bold uppercase">Paquete</span> {r.paquete.nombre}</> : r.sitio?.nombre}</span>
                  <span>•</span>
                  <span>{r.personas} persona{r.personas === 1 ? "" : "s"}</span>
                  <span>•</span>
                  <span className="font-semibold text-primary">{Number(r.total) === 0 ? "Gratuito" : `${Number(r.total).toLocaleString("es-CO")}`}</span>
                  <span>•</span>
                  <span className={`font-label-xs text-label-xs font-semibold ${
                    r.estado === "confirmada" || r.estado === "completada" ? "text-secondary" : r.estado === "rechazada" || r.estado === "no_asistio" ? "text-error" : r.estado === "cancelada" ? "text-outline" : "text-on-tertiary-container"
                  }`}>
                    {r.estado === "no_asistio" ? "No asistió" : r.estado === "completada" ? (r.cierre_automatico ? "Completada (cierre automático)" : "Completada") : r.estado === "confirmada" ? "Confirmada" : r.estado === "rechazada" ? "Rechazada" : r.estado === "cancelada" ? (r.cancelacion_tardia ? "Cancelada por el turista (tardía)" : "Cancelada por el turista") : "Pendiente"}
                  </span>
                </div>
                {r.nota && (
                  <p className="mt-1 font-body-sm text-body-sm text-on-surface-variant flex items-start gap-1">
                    <span className="material-symbols-outlined text-[16px] mt-0.5">sticky_note_2</span>
                    <span>“{r.nota}”</span>
                  </p>
                )}
                {r.estado === "rechazada" && r.motivo_rechazo && (
                  <p className="mt-1 font-label-xs text-label-xs text-error">Motivo: {r.motivo_rechazo}</p>
                )}
              </div>
            </div>
            {r.estado === "confirmada" && r.fecha_servicio <= hoyISO() && (
              <div className="flex flex-col items-start sm:items-end gap-1.5 shrink-0">
                <span className="font-label-xs text-label-xs text-on-surface-variant">¿Asistió?</span>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => registrar(r, "asistio")}
                    disabled={accionando === r.id}
                    className="bg-primary text-on-primary hover:bg-secondary font-label-xs text-label-xs font-semibold px-3 py-2 rounded-xl transition-colors disabled:opacity-50"
                  >
                    Asistió
                  </button>
                  <button
                    onClick={() => registrar(r, "no_asistio")}
                    disabled={accionando === r.id}
                    className="bg-surface-container hover:bg-surface-container-high text-on-surface font-label-xs text-label-xs font-semibold px-3 py-2 rounded-xl transition-colors disabled:opacity-50"
                  >
                    No asistió
                  </button>
                </div>
                {gracia && <span className="font-label-xs text-label-xs text-outline">Si no lo registras, se cierra sola el {sumarDias(r.fecha_servicio, gracia)}.</span>}
              </div>
            )}
            {r.estado === "pendiente" && (
              <div className="flex items-center gap-2 shrink-0">
                <button
                  onClick={() => onAccion(r.id, "confirmar")}
                  disabled={accionando === r.id}
                  className="bg-primary text-on-primary hover:bg-secondary font-label-xs text-label-xs font-semibold px-3 py-2 rounded-xl transition-colors disabled:opacity-50"
                >
                  Confirmar
                </button>
                <button
                  onClick={() => setRechazando(r)}
                  disabled={accionando === r.id}
                  className="bg-surface-container hover:bg-surface-container-high text-on-surface font-label-xs text-label-xs font-semibold px-3 py-2 rounded-xl transition-colors disabled:opacity-50"
                >
                  Rechazar
                </button>
              </div>
            )}
          </div>
        ))}
      </div>

      {rechazando && (
        <div className="fixed inset-0 bg-black/40 z-[60] flex items-center justify-center p-4" onClick={() => setRechazando(null)}>
          <form onClick={(e) => e.stopPropagation()} onSubmit={confirmarRechazo} className="w-full max-w-md bg-surface-container-lowest rounded-2xl p-6 shadow-xl flex flex-col gap-3">
            <h3 className="font-headline-md text-headline-md text-primary">Rechazar reserva</h3>
            <p className="font-body-sm text-body-sm text-on-surface-variant">
              {rechazando.turista?.nombre} · {rechazando.paquete?.nombre || rechazando.sitio?.nombre} · {rechazando.fecha_servicio}
            </p>
            <label className="flex flex-col gap-1.5">
              <span className="font-label-md text-label-md text-on-surface font-semibold">Motivo (se lo enviamos al turista)</span>
              <textarea
                rows={3}
                maxLength={300}
                autoFocus
                value={motivo}
                onChange={(e) => setMotivo(e.target.value)}
                placeholder="Ej. Ese día estamos en mantenimiento. Puedes reservar desde el lunes."
                className="px-4 py-2.5 rounded-xl bg-surface-container-low border border-surface-container-high outline-none focus:border-secondary resize-none"
              />
            </label>
            <div className="flex items-center gap-2">
              <button type="button" onClick={() => setRechazando(null)} className="flex-1 py-2.5 rounded-xl bg-surface-container text-on-surface font-label-md text-label-md hover:bg-surface-container-high transition-colors">Volver</button>
              <button type="submit" disabled={accionando === rechazando.id} className="flex-1 py-2.5 rounded-xl bg-error text-on-error font-label-md text-label-md hover:opacity-90 transition-colors disabled:opacity-60">Rechazar reserva</button>
            </div>
          </form>
        </div>
      )}
    </section>
  );
}
