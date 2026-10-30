import { useEffect, useMemo, useState } from "react";
import { api } from "../api/client";
import { useAuth } from "../context/auth";
import { CATEGORIA_ICONOS } from "../constants";
import ModalMotivo from "../components/ModalMotivo";
import UsuariosAdmin from "../components/admin/UsuariosAdmin";
import { ServiciosAdmin, PaquetesAdmin } from "../components/admin/ModeracionAdmin";
import ResenasAdmin from "../components/admin/ResenasAdmin";
import TendenciasAdmin from "../components/admin/TendenciasAdmin";
import AuditoriaAdmin from "../components/admin/AuditoriaAdmin";
import AnunciosAdmin from "../components/admin/AnunciosAdmin";
import ReportesMensajesAdmin from "../components/admin/ReportesMensajesAdmin";
import CasosAdmin from "../components/admin/CasosAdmin";
import InvitacionesAdmin from "../components/admin/InvitacionesAdmin";
import { useAvisos } from "../context/avisos";
import Tarjeta from "../components/ui/Tarjeta";

const TABS = [
  { id: "resumen", label: "Resumen y prestadores", icono: "dashboard" },
  { id: "usuarios", label: "Usuarios", icono: "group" },
  { id: "servicios", label: "Servicios", icono: "map" },
  { id: "paquetes", label: "Paquetes", icono: "inventory_2" },
  { id: "resenas", label: "Reseñas", icono: "star" },
  { id: "casos", label: "Casos de soporte", icono: "support_agent" },
  { id: "mensajes", label: "Mensajes reportados", icono: "flag" },
  { id: "tendencias", label: "Tendencias", icono: "monitoring" },
  { id: "anuncios", label: "Anuncios", icono: "campaign" },
  { id: "invitaciones", label: "Invitar negocios", icono: "person_add" },
  { id: "auditoria", label: "Historial", icono: "history" },
];

const COLOR_ESTADO_RESERVA = {
  pendiente: "bg-tertiary-fixed",
  confirmada: "bg-secondary",
  completada: "bg-primary",
  no_asistio: "bg-error",
  cancelada: "bg-outline",
  rechazada: "bg-error",
};

export default function PanelAdmin() {
  const { avisar } = useAvisos();
  const { usuario } = useAuth();
  const [pendientes, setPendientes] = useState([]);
  const [stats, setStats] = useState(null);
  const [cargando, setCargando] = useState(true);
  const [accionando, setAccionando] = useState(null);
  const [error, setError] = useState("");
  const [tab, setTab] = useState("resumen");
  const [rechazando, setRechazando] = useState(null);

  const traerTodo = () => {
    Promise.all([api.prestadoresPendientes(), api.estadisticasResumen()])
      .then(([p, s]) => { setPendientes(p); setStats(s); })
      .catch((err) => setError(err.message))
      .finally(() => setCargando(false));
  };
  const cargarTodo = () => { setCargando(true); traerTodo(); };

  useEffect(() => { traerTodo(); }, []); // arranca en "cargando", así que no hace falta encenderlo

  const handleVerificar = async (id, estado_verificacion, motivo) => {
    setAccionando(id);
    try {
      await api.verificarPrestador(id, estado_verificacion, motivo);
      cargarTodo();
    } catch (err) {
      avisar(err.message);
    } finally {
      setAccionando(null);
    }
  };

  const resumen = useMemo(() => {
    if (!stats) return null;
    const totalUsuarios = stats.usuarios_por_rol.reduce((acc, r) => acc + Number(r.total), 0);
    const prestadoresAprobados = stats.prestadores_por_estado.find((p) => p.estado_verificacion === "aprobado")?.total || 0;
    const prestadoresPendientes = stats.prestadores_por_estado.find((p) => p.estado_verificacion === "pendiente")?.total || 0;
    return { totalUsuarios, prestadoresAprobados, prestadoresPendientes };
  }, [stats]);

  if (cargando) return <p className="max-w-[1360px] mx-auto px-gutter py-space-xl font-body-md text-body-md text-on-surface-variant">Cargando panel de administrador...</p>;
  if (error) return <p className="max-w-[1360px] mx-auto px-gutter py-space-xl text-error font-body-md text-body-md">{error}</p>;

  return (
    <div className="max-w-[1360px] mx-auto px-gutter py-space-xl flex flex-col gap-8">
      {/* Cabecera */}
      <section className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-primary-container to-secondary flex items-center justify-center shadow-md shrink-0">
            <span className="material-symbols-outlined text-on-primary text-[26px]">admin_panel_settings</span>
          </div>
          <div>
            <span className="font-label-xs text-label-xs uppercase tracking-wider text-secondary font-bold">Panel del Administrador</span>
            <h1 className="font-headline-md text-headline-md text-on-surface font-semibold tracking-tight">Hola, {usuario?.nombre}</h1>
            <p className="font-body-sm text-body-sm text-on-surface-variant mt-0.5">
              Verificación de prestadores y estadísticas reales de la plataforma.
            </p>
          </div>
        </div>
      </section>

      <nav className="flex items-center gap-2 overflow-x-auto pb-1">
        {TABS.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`px-4 py-2 rounded-full font-label-md text-label-md shrink-0 flex items-center gap-1.5 transition-colors ${
              tab === t.id ? "bg-primary-container text-on-primary shadow-sm" : "bg-surface-container hover:bg-surface-container-high text-on-surface"
            }`}
          >
            <span className="material-symbols-outlined text-[18px]">{t.icono}</span>
            {t.label}
          </button>
        ))}
      </nav>

      {tab === "usuarios" && <UsuariosAdmin usuarioActualId={usuario?.id} />}
      {tab === "servicios" && <ServiciosAdmin />}
      {tab === "paquetes" && <PaquetesAdmin />}
      {tab === "resenas" && <ResenasAdmin />}
      {tab === "casos" && <CasosAdmin />}
      {tab === "mensajes" && <ReportesMensajesAdmin />}
      {tab === "tendencias" && <TendenciasAdmin />}
      {tab === "anuncios" && <AnunciosAdmin />}
      {tab === "invitaciones" && <InvitacionesAdmin />}
      {tab === "auditoria" && <AuditoriaAdmin />}

      {tab === "resumen" && <>
      {/* KPIs reales */}
      {resumen && (
        <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <Tarjeta className="p-5">
            <div className="flex items-center justify-between">
              <span className="font-label-xs text-label-xs uppercase tracking-wider text-outline font-semibold">Usuarios registrados</span>
              <span className="material-symbols-outlined text-[18px] text-primary">group</span>
            </div>
            <span className="font-headline-xl text-headline-xl text-on-surface font-bold block mt-2">{resumen.totalUsuarios}</span>
            <span className="font-label-xs text-label-xs text-outline">turistas, prestadores y administradores</span>
          </Tarjeta>
          <Tarjeta className="p-5">
            <div className="flex items-center justify-between">
              <span className="font-label-xs text-label-xs uppercase tracking-wider text-outline font-semibold">Prestadores aprobados</span>
              <span className="material-symbols-outlined text-[18px] text-secondary">verified</span>
            </div>
            <span className="font-headline-xl text-headline-xl text-on-surface font-bold block mt-2">{resumen.prestadoresAprobados}</span>
            <span className="font-label-xs text-label-xs text-outline">{resumen.prestadoresPendientes} pendiente(s) por revisar</span>
          </Tarjeta>
          <Tarjeta className="p-5">
            <div className="flex items-center justify-between">
              <span className="font-label-xs text-label-xs uppercase tracking-wider text-outline font-semibold">Sitios activos</span>
              <span className="material-symbols-outlined text-[18px] text-primary">map</span>
            </div>
            <span className="font-headline-xl text-headline-xl text-on-surface font-bold block mt-2">{stats.sitios_activos_en_catalogo}</span>
            <span className="font-label-xs text-label-xs text-outline">publicados en el catálogo</span>
          </Tarjeta>
          <div className="bg-primary-container text-on-primary-container rounded-2xl p-5 shadow-sm">
            <div className="flex items-center justify-between">
              <span className="font-label-xs text-label-xs uppercase tracking-wider text-primary-fixed-dim font-bold">Reservas totales</span>
              <span className="material-symbols-outlined text-[18px] text-primary-fixed">confirmation_number</span>
            </div>
            <span className="font-headline-md text-headline-md text-on-primary font-bold block mt-2">{stats.reservas.total}</span>
            <span className="font-label-xs text-label-xs text-primary-fixed-dim">{stats.itinerarios_generados} itinerario(s) generado(s) con IA</span>
          </div>
        </section>
      )}

      {/* Reservas por estado + Destinos con mayor interés */}
      {stats && (
        <section className="grid grid-cols-1 lg:grid-cols-12 gap-space-lg">
          <Tarjeta className="lg:col-span-7 p-space-lg flex flex-col">
            <h2 className="font-title-lg text-title-lg text-on-surface font-semibold mb-1">Reservas por estado</h2>
            <p className="font-body-sm text-body-sm text-on-surface-variant mb-4">Distribución real de solicitudes en toda la plataforma</p>
            {stats.reservas.por_estado.length === 0 && (
              <p className="font-body-sm text-body-sm text-on-surface-variant">Aún no hay reservas registradas.</p>
            )}
            <div className="flex flex-col gap-3">
              {stats.reservas.por_estado.map((r) => {
                const pct = stats.reservas.total > 0 ? Math.round((Number(r.total) / stats.reservas.total) * 100) : 0;
                return (
                  <div key={r.estado} className="flex flex-col gap-1">
                    <div className="flex items-center justify-between font-label-md text-label-md text-on-surface">
                      <span className="capitalize">{r.estado}</span>
                      <span className="font-semibold">{r.total} ({pct}%)</span>
                    </div>
                    <div className="w-full h-2.5 rounded-full bg-surface-container-low overflow-hidden">
                      <div
                        className={`h-full rounded-full ${COLOR_ESTADO_RESERVA[r.estado] || "bg-outline"}`}
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </Tarjeta>

          <Tarjeta className="lg:col-span-5 p-space-lg flex flex-col">
            <div className="flex items-center gap-2 mb-1">
              <span className="material-symbols-outlined text-primary text-[20px]">auto_awesome</span>
              <h2 className="font-title-lg text-title-lg text-on-surface font-semibold">Destinos con mayor interés</h2>
            </div>
            <p className="font-body-sm text-body-sm text-on-surface-variant mb-4">Veces incluidos en itinerarios generados por el motor de recomendación</p>
            {stats.destinos_con_mayor_interes.length === 0 && (
              <p className="font-body-sm text-body-sm text-on-surface-variant">Aún no se han generado itinerarios.</p>
            )}
            <div className="flex flex-col gap-2">
              {stats.destinos_con_mayor_interes.map((d, i) => (
                <div key={i} className="flex items-center justify-between p-3 rounded-xl bg-surface-container-low">
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="material-symbols-outlined text-[18px] text-secondary shrink-0">{CATEGORIA_ICONOS[d.categoria] || "place"}</span>
                    <div className="flex flex-col min-w-0">
                      <span className="font-title-sm text-title-sm text-on-surface font-semibold truncate">{d.sitio}</span>
                      <span className="font-label-xs text-label-xs text-outline">{d.municipio}</span>
                    </div>
                  </div>
                  <span className="font-title-sm text-title-sm text-primary font-bold shrink-0">{d.veces_incluido_en_itinerarios}</span>
                </div>
              ))}
            </div>
          </Tarjeta>
        </section>
      )}

      {/* Prestadores pendientes + Destinos más reservados */}
      <section className="grid grid-cols-1 xl:grid-cols-12 gap-space-lg">
        <Tarjeta className="xl:col-span-8 p-space-lg flex flex-col">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="font-title-lg text-title-lg text-on-surface font-semibold">Prestadores pendientes de verificación</h2>
              <p className="font-body-sm text-body-sm text-on-surface-variant">Aprueba o rechaza el ingreso de nuevos negocios al catálogo</p>
            </div>
            <span className="bg-surface-container px-3 py-1 rounded-lg font-label-xs text-label-xs text-primary font-semibold shrink-0">{pendientes.length} pendiente(s)</span>
          </div>

          {pendientes.length === 0 && (
            <p className="font-body-sm text-body-sm text-on-surface-variant">No hay prestadores pendientes por revisar.</p>
          )}

          <div className="flex flex-col gap-3">
            {pendientes.map((p) => (
              <div key={p.id} className="p-4 rounded-xl bg-surface-container-low flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                <div>
                  <h3 className="font-title-sm text-title-sm text-on-surface font-semibold">{p.nombre_negocio}</h3>
                  <p className="font-label-xs text-label-xs text-outline">{p.municipio} · {p.categoria}</p>
                  <p className="font-body-sm text-body-sm text-on-surface-variant mt-0.5">{p.Usuario?.nombre} — {p.Usuario?.correo}</p>
                  {p.descripcion && <p className="font-body-sm text-body-sm text-on-surface-variant mt-1">{p.descripcion}</p>}
                  <p className="font-label-xs text-label-xs text-outline mt-1 flex flex-wrap gap-x-3 gap-y-0.5">
                    {p.telefono && <span>WhatsApp: {p.telefono}</span>}
                    {p.direccion && <span>Dirección: {p.direccion}</span>}
                    {p.redes && <span>Redes: {p.redes}</span>}
                  </p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <button
                    onClick={() => handleVerificar(p.id, "aprobado")}
                    disabled={accionando === p.id}
                    className="bg-primary text-on-primary hover:bg-secondary font-label-xs text-label-xs font-semibold px-3 py-2 rounded-xl transition-colors disabled:opacity-50"
                  >
                    Aprobar
                  </button>
                  <button
                    onClick={() => setRechazando(p)}
                    disabled={accionando === p.id}
                    className="bg-surface-container hover:bg-surface-container-high text-on-surface font-label-xs text-label-xs font-semibold px-3 py-2 rounded-xl transition-colors disabled:opacity-50"
                  >
                    Rechazar
                  </button>
                </div>
              </div>
            ))}
          </div>
        </Tarjeta>

        <Tarjeta className="xl:col-span-4 p-space-lg flex flex-col">
          <div className="flex items-center gap-2 mb-1">
            <span className="material-symbols-outlined text-secondary text-[20px]">bookmark_added</span>
            <h2 className="font-title-lg text-title-lg text-on-surface font-semibold">Destinos más reservados</h2>
          </div>
          <p className="font-body-sm text-body-sm text-on-surface-variant mb-4">Sitios con más solicitudes de reserva confirmadas o pendientes</p>
          {stats && stats.destinos_mas_reservados.length === 0 && (
            <p className="font-body-sm text-body-sm text-on-surface-variant">Aún no hay reservas registradas.</p>
          )}
          <div className="flex flex-col gap-2">
            {stats && stats.destinos_mas_reservados.map((d, i) => (
              <div key={i} className="flex items-center justify-between p-3 rounded-xl bg-surface-container-low">
                <div className="flex items-center gap-2 min-w-0">
                  <span className="material-symbols-outlined text-[18px] text-primary shrink-0">{CATEGORIA_ICONOS[d.categoria] || "place"}</span>
                  <div className="flex flex-col min-w-0">
                    <span className="font-title-sm text-title-sm text-on-surface font-semibold truncate">{d.sitio}</span>
                    <span className="font-label-xs text-label-xs text-outline">{d.municipio}</span>
                  </div>
                </div>
                <span className="font-title-sm text-title-sm text-primary font-bold shrink-0">{d.total_reservas}</span>
              </div>
            ))}
          </div>
        </Tarjeta>
      </section>
      </>}

      {rechazando && (
        <ModalMotivo
          titulo="Rechazar prestador"
          descripcion={`${rechazando.nombre_negocio} · ${rechazando.Usuario?.correo}`}
          etiqueta="Motivo (se lo enviamos al prestador para que pueda corregir)"
          placeholder="Ej. Falta una descripción clara del negocio y un teléfono de contacto."
          textoConfirmar="Rechazar prestador"
          obligatorio
          peligro
          onConfirmar={async (motivo) => { await handleVerificar(rechazando.id, "rechazado", motivo); setRechazando(null); }}
          onCerrar={() => setRechazando(null)}
        />
      )}
    </div>
  );
}
