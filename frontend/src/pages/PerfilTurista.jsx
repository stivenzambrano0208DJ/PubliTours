import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { api, urlImagen } from "../api/client";
import { useAuth } from "../context/auth";
import { CATEGORIA_ICONOS } from "../constants";
import MisDatos from "../components/perfil/MisDatos";
import Favoritos from "../components/perfil/Favoritos";
import { useIdioma } from "../context/idioma";

const TIPO_NOTIFICACION_ICONO = {
  nueva_reserva: "confirmation_number",
  reserva_confirmada: "check_circle",
  reserva_rechazada: "cancel",
  reserva_cancelada: "event_busy",
  nueva_resena: "star",
  reserva_solicitada: "send",
  reserva_completada: "task_alt",
  reserva_no_asistio: "person_off",
  resena_respondida: "reply",
  resena_retirada: "report",
  prestador_aprobado: "verified",
  prestador_nuevo: "storefront",
  prestador_rechazado: "cancel",
  sitio_oculto: "visibility_off",
  sitio_publicado: "visibility",
};

export default function PerfilTurista() {
  const { t, locale } = useIdioma();
  const { usuario } = useAuth();
  const navigate = useNavigate();

  const [reservas, setReservas] = useState([]);
  const [notificaciones, setNotificaciones] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [tab, setTab] = useState("resumen");
  const [marcando, setMarcando] = useState(null);

  const cargar = () => {
    Promise.all([api.misReservas(), api.misNotificaciones()])
      .then(([r, n]) => { setReservas(r); setNotificaciones(n); })
      .catch(() => {})
      .finally(() => setCargando(false));
  };

  useEffect(() => { cargar(); }, []); // arranca en "cargando"

  const kpis = useMemo(() => ({
    total: reservas.length,
    confirmadas: reservas.filter((r) => r.estado === "confirmada" || r.estado === "completada").length,
    pendientes: reservas.filter((r) => r.estado === "pendiente").length,
  }), [reservas]);

  const proximaReserva = useMemo(() => {
    const hoy = new Date();
    return reservas
      .filter((r) => r.estado === "confirmada" && new Date(r.fecha_servicio) >= hoy)
      .sort((a, b) => new Date(a.fecha_servicio) - new Date(b.fecha_servicio))[0] || null;
  }, [reservas]);

  const historial = useMemo(() => {
    return reservas
      .filter((r) => r.estado === "completada")
      .sort((a, b) => new Date(b.fecha_servicio) - new Date(a.fecha_servicio));
  }, [reservas]);

  const noLeidas = useMemo(() => notificaciones.filter((n) => !n.leido).length, [notificaciones]);

  const handleMarcarLeida = async (id) => {
    setMarcando(id);
    try {
      await api.marcarNotificacionLeida(id);
      setNotificaciones((prev) => prev.map((n) => (n.id === id ? { ...n, leido: true } : n)));
    } catch {
      // silencioso: no es una acción crítica
    } finally {
      setMarcando(null);
    }
  };

  if (cargando) {
    return <p className="max-w-[1360px] mx-auto px-gutter py-space-xl font-body-md text-body-md text-on-surface-variant">{t("Cargando perfil...")}</p>;
  }

  return (
    <div className="w-full max-w-[1360px] mx-auto px-margin-mobile md:px-margin py-space-lg md:py-space-xl space-y-space-xl">
      {/* Cabecera de perfil */}
      <div className="relative overflow-hidden rounded-3xl bg-surface-container-lowest p-space-md md:p-space-xl shadow-[0_4px_28px_-4px_rgba(6,78,59,0.06)]">
        <div className="absolute -right-16 -top-24 w-96 h-96 rounded-full bg-primary-fixed/30 blur-3xl pointer-events-none" />
        <div className="relative flex flex-col sm:flex-row sm:items-center gap-space-md md:gap-space-lg">
          <div className="w-20 h-20 md:w-24 md:h-24 rounded-2xl bg-gradient-to-br from-primary-container to-secondary flex items-center justify-center text-on-primary font-headline-md text-headline-md font-bold shrink-0 shadow-[0_8px_20px_-4px_rgba(0,53,39,0.2)]">
            {usuario?.nombre?.charAt(0).toUpperCase() || "?"}
          </div>
          <div className="space-y-space-xs">
            <span className="font-headline-xl text-headline-xl text-on-surface font-bold block">{t("¡Hola, {nombre}!", { nombre: usuario?.nombre })}</span>
            <div className="flex flex-wrap items-center gap-space-xs">
              <span className="inline-flex items-center gap-1 px-space-sm py-0.5 rounded-full bg-secondary-container text-on-secondary-fixed font-label-xs text-label-xs font-semibold capitalize">
                <span className="material-symbols-outlined text-[13px]">badge</span>
                {{ turista: t("Turista"), prestador: t("Prestador"), administrador: t("Administrador") }[usuario?.rol] || usuario?.rol}
              </span>
              <span className="font-body-sm text-body-sm text-on-surface-variant">{usuario?.correo}</span>
              {usuario?.fecha_registro && (
                <span className="font-body-sm text-body-sm text-on-surface-variant">
                  · {t("Miembro desde {fecha}", { fecha: new Date(usuario.fecha_registro).toLocaleDateString(locale) })}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Navegación real hacia otras secciones */}
        <div className="mt-space-lg pt-space-md flex items-center gap-space-xs overflow-x-auto no-scrollbar">
          <button
            onClick={() => setTab("resumen")}
            className={`px-space-md py-space-xs rounded-full font-label-md text-label-md shrink-0 flex items-center gap-space-xs transition-colors ${
              tab === "resumen" ? "bg-primary-container text-on-primary shadow-sm" : "bg-surface-container hover:bg-surface-container-high text-on-surface"
            }`}
          >
            <span className="material-symbols-outlined text-[18px]">person</span>
            <span>{t("Resumen")}</span>
          </button>
          <button
            onClick={() => setTab("notificaciones")}
            className={`px-space-md py-space-xs rounded-full font-label-md text-label-md shrink-0 flex items-center gap-space-xs transition-colors relative ${
              tab === "notificaciones" ? "bg-primary-container text-on-primary shadow-sm" : "bg-surface-container hover:bg-surface-container-high text-on-surface"
            }`}
          >
            <span className="material-symbols-outlined text-[18px]">notifications</span>
            <span>{t("Notificaciones")}</span>
            {noLeidas > 0 && <span className="w-2 h-2 rounded-full bg-error" />}
          </button>
          <button
            onClick={() => setTab("favoritos")}
            className={`px-space-md py-space-xs rounded-full font-label-md text-label-md shrink-0 flex items-center gap-space-xs transition-colors ${
              tab === "favoritos" ? "bg-primary-container text-on-primary shadow-sm" : "bg-surface-container hover:bg-surface-container-high text-on-surface"
            }`}
          >
            <span className="material-symbols-outlined text-[18px]">favorite</span>
            <span>{t("Favoritos")}</span>
          </button>
          <button
            onClick={() => setTab("datos")}
            className={`px-space-md py-space-xs rounded-full font-label-md text-label-md shrink-0 flex items-center gap-space-xs transition-colors ${
              tab === "datos" ? "bg-primary-container text-on-primary shadow-sm" : "bg-surface-container hover:bg-surface-container-high text-on-surface"
            }`}
          >
            <span className="material-symbols-outlined text-[18px]">manage_accounts</span>
            <span>{t("Mis datos")}</span>
          </button>
          <button
            onClick={() => navigate("/itinerario")}
            className="px-space-md py-space-xs rounded-full bg-surface-container hover:bg-surface-container-high text-on-surface font-label-md text-label-md shrink-0 transition-colors flex items-center gap-space-xs"
          >
            <span className="material-symbols-outlined text-[18px] text-secondary">auto_awesome</span>
            <span>{t("Itinerario IA")}</span>
          </button>
          <button
            onClick={() => navigate("/mis-reservas")}
            className="px-space-md py-space-xs rounded-full bg-surface-container hover:bg-surface-container-high text-on-surface font-label-md text-label-md shrink-0 transition-colors flex items-center gap-space-xs"
          >
            <span className="material-symbols-outlined text-[18px]">confirmation_number</span>
            <span>{t("Mis Reservas")}</span>
          </button>
          <button
            onClick={() => navigate("/explorar")}
            className="px-space-md py-space-xs rounded-full bg-surface-container hover:bg-surface-container-high text-on-surface font-label-md text-label-md shrink-0 transition-colors flex items-center gap-space-xs"
          >
            <span className="material-symbols-outlined text-[18px]">travel_explore</span>
            <span>{t("Explorar Destinos")}</span>
          </button>
        </div>
      </div>

      {tab === "resumen" && (
        <>
          {/* KPIs reales */}
          <section className="grid grid-cols-1 sm:grid-cols-3 gap-space-md">
            <div className="bg-surface-container-lowest rounded-2xl p-5 shadow-sm">
              <div className="flex items-center justify-between">
                <span className="font-label-xs text-label-xs uppercase tracking-wider text-outline font-semibold">{t("Reservas totales")}</span>
                <span className="material-symbols-outlined text-[18px] text-primary">confirmation_number</span>
              </div>
              <span className="font-headline-xl text-headline-xl text-on-surface font-bold block mt-2">{kpis.total}</span>
            </div>
            <div className="bg-surface-container-lowest rounded-2xl p-5 shadow-sm">
              <div className="flex items-center justify-between">
                <span className="font-label-xs text-label-xs uppercase tracking-wider text-outline font-semibold">{t("Confirmadas")}</span>
                <span className="material-symbols-outlined text-[18px] text-secondary">check_circle</span>
              </div>
              <span className="font-headline-xl text-headline-xl text-on-surface font-bold block mt-2">{kpis.confirmadas}</span>
            </div>
            <div className="bg-surface-container-lowest rounded-2xl p-5 shadow-sm">
              <div className="flex items-center justify-between">
                <span className="font-label-xs text-label-xs uppercase tracking-wider text-outline font-semibold">{t("Pendientes")}</span>
                <span className="material-symbols-outlined text-[18px] text-on-tertiary-container">hourglass_top</span>
              </div>
              <span className="font-headline-xl text-headline-xl text-on-surface font-bold block mt-2">{kpis.pendientes}</span>
            </div>
          </section>

          {/* Tu próximo viaje (datos reales) */}
          {proximaReserva && (
            <section className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-primary-container to-secondary text-on-primary p-space-lg shadow-[0_12px_36px_-6px_rgba(6,78,59,0.2)] flex flex-col sm:flex-row sm:items-center justify-between gap-space-md">
              <div className="flex items-center gap-space-md">
                <div className="w-14 h-14 rounded-2xl overflow-hidden bg-surface-container-lowest/15 backdrop-blur-md flex items-center justify-center shrink-0">
                  {proximaReserva.sitio?.imagen_url ? <img src={urlImagen(proximaReserva.sitio.imagen_url)} alt="" className="w-full h-full object-cover" /> : (
<span className="material-symbols-outlined text-[28px]">{CATEGORIA_ICONOS[proximaReserva.sitio?.categoria] || "place"}</span>
)}
                </div>
                <div>
                  <span className="font-label-xs text-label-xs uppercase tracking-widest text-tertiary-fixed font-semibold">{t("Tu próximo viaje confirmado")}</span>
                  <h2 className="font-title-lg text-title-lg font-bold">{proximaReserva.paquete?.nombre || proximaReserva.sitio?.nombre}</h2>
                  <div className="flex flex-wrap items-center gap-x-space-md gap-y-1 font-body-sm text-body-sm text-on-primary-container mt-1">
                    <span className="flex items-center gap-1">
                      <span className="material-symbols-outlined text-[16px]">calendar_today</span>
                      {proximaReserva.fecha_servicio}
                    </span>
                    <span className="flex items-center gap-1">
                      <span className="material-symbols-outlined text-[16px]">location_on</span>
                      {proximaReserva.sitio?.municipio}, Caquetá
                    </span>
                  </div>
                </div>
              </div>
              <button
                onClick={() => navigate("/mis-reservas")}
                className="shrink-0 px-space-md py-space-sm rounded-xl bg-surface-container-lowest text-primary hover:bg-surface font-label-md text-label-md shadow-md transition-all"
              >
                {t("Ver detalle")}
              </button>
            </section>
          )}

          {/* Historial real de viajes ya realizados */}
          <section className="space-y-space-sm">
            <h2 className="font-headline-md text-headline-md text-on-surface font-bold">{t("Historial de viajes")}</h2>
            {historial.length === 0 ? (
              <div className="bg-surface-container-lowest rounded-2xl p-space-lg text-center">
                <p className="font-body-sm text-body-sm text-on-surface-variant">{t("Aún no tienes viajes confirmados en fechas pasadas.")}</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-space-sm">
                {historial.map((r) => (
                  <div key={r.id} className="bg-surface-container-lowest rounded-2xl p-space-md flex items-center gap-space-sm shadow-sm">
                    <div className="w-11 h-11 rounded-xl overflow-hidden bg-gradient-to-br from-primary-container to-secondary flex items-center justify-center shrink-0">
                      {r.sitio?.imagen_url ? <img loading="lazy" decoding="async" src={urlImagen(r.sitio.imagen_url)} alt="" className="w-full h-full object-cover" /> : (
<span className="material-symbols-outlined text-on-primary text-[20px]">{CATEGORIA_ICONOS[r.sitio?.categoria] || "place"}</span>
)}
                    </div>
                    <div className="min-w-0">
                      <span className="font-title-sm text-title-sm text-on-surface font-semibold block truncate">{r.paquete?.nombre || r.sitio?.nombre}</span>
                      <span className="font-label-xs text-label-xs text-outline">{r.fecha_servicio} · {r.sitio?.municipio}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>

          <div className="rounded-2xl bg-surface-container-high/80 p-space-md flex flex-col md:flex-row items-center justify-between gap-space-md">
            <div className="flex items-center gap-space-sm">
              <span className="material-symbols-outlined text-secondary text-[28px]">auto_awesome</span>
              <div>
                <span className="font-title-sm text-title-sm text-on-surface font-bold">{t("¿Quieres planear tu próxima experiencia?")}</span>
                <p className="font-body-sm text-body-sm text-on-surface-variant">{t("Genera un itinerario con el motor de scoring real de PubliTours.")}</p>
              </div>
            </div>
            <button
              onClick={() => navigate("/itinerario")}
              className="shrink-0 inline-flex items-center gap-space-xs px-space-lg py-space-xs rounded-full bg-primary-container hover:bg-secondary text-on-primary font-label-md text-label-md transition-all"
            >
              <span className="material-symbols-outlined text-[18px]">auto_awesome</span>
              {t("Generar itinerario")}
            </button>
          </div>
        </>
      )}

      {tab === "favoritos" && <Favoritos />}
      {tab === "datos" && <MisDatos />}

      {tab === "notificaciones" && (
        <section className="space-y-space-sm">
          <h2 className="font-headline-md text-headline-md text-on-surface font-bold">{t("Notificaciones")}</h2>
          {notificaciones.length === 0 ? (
            <div className="bg-surface-container-lowest rounded-2xl p-space-lg text-center">
              <p className="font-body-sm text-body-sm text-on-surface-variant">{t("No tienes notificaciones todavía.")}</p>
            </div>
          ) : (
            <div className="flex flex-col gap-space-sm">
              {notificaciones.map((n) => (
                <div
                  key={n.id}
                  className={`rounded-2xl p-space-md flex items-start justify-between gap-space-sm shadow-sm ${
                    n.leido ? "bg-surface-container-lowest" : "bg-secondary-container/20"
                  }`}
                >
                  <div className="flex items-start gap-space-sm">
                    <span className="material-symbols-outlined text-secondary text-[20px] mt-0.5">
                      {TIPO_NOTIFICACION_ICONO[n.tipo] || "notifications"}
                    </span>
                    <div>
                      <p className="font-body-sm text-body-sm text-on-surface">{n.mensaje}</p>
                      <span className="font-label-xs text-label-xs text-outline">{new Date(n.fecha).toLocaleString(locale)}</span>
                    </div>
                  </div>
                  {!n.leido && (
                    <button
                      onClick={() => handleMarcarLeida(n.id)}
                      disabled={marcando === n.id}
                      className="shrink-0 px-3 py-1.5 rounded-lg bg-surface-container text-on-surface font-label-xs text-label-xs font-semibold hover:bg-surface-container-high transition-colors disabled:opacity-50"
                    >
                      {t("Marcar leída")}
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}
        </section>
      )}
    </div>
  );
}
