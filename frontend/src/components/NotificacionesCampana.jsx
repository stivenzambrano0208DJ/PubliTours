import { useCallback, useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "../api/client";

const INTERVALO_MS = 15000;
const ICONOS = {
  nueva_reserva: "event_available",
  reserva_confirmada: "check_circle",
  reserva_rechazada: "cancel",
  reserva_cancelada: "event_busy",
  nueva_resena: "star",
  reserva_solicitada: "send",
  reserva_completada: "task_alt",
  resena_respondida: "reply",
  resena_retirada: "report",
  prestador_aprobado: "verified",
  prestador_nuevo: "storefront",
  prestador_rechazado: "cancel",
  sitio_oculto: "visibility_off",
  sitio_publicado: "visibility",
  anuncio_admin: "campaign",
  reserva_no_asistio: "person_off",
  asistencia_pendiente: "how_to_reg",
  mensaje_nuevo: "chat",
  mensaje_reportado: "flag",
  mensaje_retirado: "report",
};

const destinoDe = (n) => (n.tipo === "mensaje_nuevo" || n.tipo === "mensaje_retirado" ? "/mensajes" : n.tipo === "mensaje_reportado" ? "/admin" : n.tipo === "nueva_reserva" || n.tipo === "asistencia_pendiente" ? "/mi-negocio" : n.tipo === "reserva_cancelada" ? "/mi-negocio" : n.tipo === "nueva_resena" ? "/mi-negocio" : n.tipo === "prestador_nuevo" ? "/admin" : n.tipo.startsWith("prestador_") || n.tipo.startsWith("sitio_") ? "/mi-negocio" : n.tipo === "resena_respondida" ? "/mis-reservas" : n.tipo.startsWith("reserva_") ? "/mis-reservas" : null);

function tiempoRelativo(fecha) {
  const min = Math.floor((Date.now() - new Date(fecha).getTime()) / 60000);
  if (min < 1) return "hace un momento";
  if (min < 60) return `hace ${min} min`;
  if (min < 1440) return `hace ${Math.floor(min / 60)} h`;
  return new Date(fecha).toLocaleDateString("es-CO");
}

// Campana con contador, lista desplegable y alerta emergente cuando llega una notificación nueva.
export default function NotificacionesCampana() {
  const navigate = useNavigate();
  const [notificaciones, setNotificaciones] = useState([]);
  const [abierto, setAbierto] = useState(false);
  const [alerta, setAlerta] = useState(null);
  const vistas = useRef(null); // ids ya conocidos; null = aún no se cargó la primera vez
  const contenedor = useRef(null);

  const cargar = useCallback(() => api.misNotificaciones().then((lista) => {
    setNotificaciones(lista);
    const noLeidas = lista.filter((n) => !n.leido);
    if (vistas.current === null) {
      if (noLeidas.length > 0) setAlerta(noLeidas.length === 1 ? noLeidas[0] : { id: "resumen", tipo: "resumen", mensaje: `Tienes ${noLeidas.length} notificaciones sin leer.` });
    } else {
      const nueva = noLeidas.find((n) => !vistas.current.has(n.id));
      if (nueva) setAlerta(nueva);
    }
    vistas.current = new Set(lista.map((n) => n.id));
  }).catch(() => {
    /* sin conexión o sesión vencida: se reintenta en el siguiente ciclo */
  }), []);

  useEffect(() => {
    cargar();
    const t = setInterval(cargar, INTERVALO_MS);
    return () => clearInterval(t);
  }, [cargar]);

  useEffect(() => {
    if (!alerta) return;
    const t = setTimeout(() => setAlerta(null), 8000);
    return () => clearTimeout(t);
  }, [alerta]);

  useEffect(() => {
    const cerrarFuera = (e) => { if (contenedor.current && !contenedor.current.contains(e.target)) setAbierto(false); };
    document.addEventListener("mousedown", cerrarFuera);
    return () => document.removeEventListener("mousedown", cerrarFuera);
  }, []);

  const noLeidas = notificaciones.filter((n) => !n.leido).length;

  const abrir = async (n) => {
    setAbierto(false);
    setAlerta(null);
    if (!n.leido) {
      setNotificaciones((prev) => prev.map((x) => (x.id === n.id ? { ...x, leido: true } : x)));
      api.marcarNotificacionLeida(n.id).catch(() => {});
    }
    const destino = destinoDe(n);
    if (destino) navigate(destino);
  };

  const marcarTodas = () => {
    const pendientes = notificaciones.filter((n) => !n.leido);
    setNotificaciones((prev) => prev.map((n) => ({ ...n, leido: true })));
    pendientes.forEach((n) => api.marcarNotificacionLeida(n.id).catch(() => {}));
  };

  return (
    <>
      <div className="relative" ref={contenedor}>
        <button
          onClick={() => setAbierto((v) => !v)}
          className="relative p-2 rounded-xl text-on-surface hover:bg-surface-container transition-colors"
          aria-label="Notificaciones"
        >
          <span className="material-symbols-outlined text-[24px]">{noLeidas ? "notifications_active" : "notifications"}</span>
          {noLeidas > 0 && (
            <span className="absolute top-0.5 right-0.5 min-w-[18px] h-[18px] px-1 rounded-full bg-error text-on-error text-[11px] font-bold flex items-center justify-center">
              {noLeidas > 9 ? "9+" : noLeidas}
            </span>
          )}
        </button>

        {abierto && (
          <div className="absolute right-0 top-full mt-2 w-80 max-w-[90vw] rounded-2xl bg-surface-container-lowest shadow-[0_20px_40px_-8px_rgba(6,78,59,0.18)] border border-surface-container-high overflow-hidden z-50">
            <div className="flex items-center justify-between px-4 py-3 border-b border-surface-container-high">
              <span className="font-title-sm text-title-sm text-on-surface font-semibold">Notificaciones</span>
              {noLeidas > 0 && (
                <button onClick={marcarTodas} className="font-label-xs text-label-xs text-secondary font-semibold hover:underline">
                  Marcar todas como leídas
                </button>
              )}
            </div>
            <div className="max-h-96 overflow-y-auto">
              {notificaciones.length === 0 && (
                <p className="px-4 py-6 text-center font-body-sm text-body-sm text-on-surface-variant">Aún no tienes notificaciones.</p>
              )}
              {notificaciones.map((n) => (
                <button
                  key={n.id}
                  onClick={() => abrir(n)}
                  className={`w-full text-left flex items-start gap-3 px-4 py-3 hover:bg-surface-container-low transition-colors border-b border-surface-container-low ${n.leido ? "" : "bg-secondary-container/15"}`}
                >
                  <span className={`material-symbols-outlined text-[20px] mt-0.5 ${n.tipo === "reserva_rechazada" ? "text-error" : "text-secondary"}`}>
                    {ICONOS[n.tipo] || "notifications"}
                  </span>
                  <span className="flex-1 min-w-0">
                    <span className={`block font-body-sm text-body-sm ${n.leido ? "text-on-surface-variant" : "text-on-surface font-semibold"}`}>{n.mensaje}</span>
                    <span className="block font-label-xs text-label-xs text-outline mt-0.5">{tiempoRelativo(n.fecha)}</span>
                  </span>
                  {!n.leido && <span className="w-2 h-2 rounded-full bg-secondary mt-1.5 shrink-0" />}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {alerta && (
        <div
          role="alert"
          className="fixed top-24 right-4 z-[70] w-[340px] max-w-[calc(100vw-2rem)] rounded-2xl bg-primary text-on-primary shadow-2xl p-4 flex items-start gap-3"
        >
          <span className="material-symbols-outlined text-[26px] text-tertiary-fixed shrink-0">{ICONOS[alerta.tipo] || "notifications_active"}</span>
          <div className="flex-1 min-w-0">
            <p className="font-title-sm text-title-sm font-semibold">{alerta.tipo === "nueva_reserva" ? "¡Nueva reserva!" : "Notificación"}</p>
            <p className="font-body-sm text-body-sm opacity-90 mt-0.5">{alerta.mensaje}</p>
            {alerta.id !== "resumen" && destinoDe(alerta) && (
              <button onClick={() => abrir(alerta)} className="mt-2 font-label-xs text-label-xs font-semibold underline">
                Ver ahora
              </button>
            )}
            {alerta.id === "resumen" && (
              <button onClick={() => { setAlerta(null); setAbierto(true); }} className="mt-2 font-label-xs text-label-xs font-semibold underline">
                Ver notificaciones
              </button>
            )}
          </div>
          <button onClick={() => setAlerta(null)} aria-label="Cerrar" className="opacity-80 hover:opacity-100">
            <span className="material-symbols-outlined text-[18px]">close</span>
          </button>
        </div>
      )}
    </>
  );
}
