import { useEffect, useState } from "react";
import { api } from "../api/client";
import FormularioPerfil from "../components/prestador/FormularioPerfil";
import CompletarPerfil from "../components/prestador/CompletarPerfil";
import EstadisticasPrestador from "../components/prestador/EstadisticasPrestador";
import EstadoVerificacion from "../components/prestador/EstadoVerificacion";
import ContactoWhatsApp from "../components/prestador/ContactoWhatsApp";
import KpisPrestador from "../components/prestador/KpisPrestador";
import TablaServicios from "../components/prestador/TablaServicios";
import ReservasRecibidas from "../components/prestador/ReservasRecibidas";
import ModalServicio from "../components/prestador/ModalServicio";
import ResenasRecibidas from "../components/prestador/ResenasRecibidas";
import PaquetesPrestador from "../components/prestador/PaquetesPrestador";
import { useAvisos } from "../context/avisos";

const scrollTo = (id) => document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" });

export default function PanelPrestador() {
  const { avisar, confirmar } = useAvisos();
  const [perfil, setPerfil] = useState(null);
  const [cargandoPerfil, setCargandoPerfil] = useState(true);
  const [sitios, setSitios] = useState([]);
  const [reservas, setReservas] = useState([]);
  const [resumen, setResumen] = useState({});
  const [cargandoDatos, setCargandoDatos] = useState(true);
  const [accionando, setAccionando] = useState(null);
  // undefined = modal cerrado, null = nuevo servicio, objeto = editando ese servicio
  const [sitioModal, setSitioModal] = useState(undefined);

  const traerDatos = () => {
    Promise.all([api.misSitios(), api.reservasRecibidas(), api.resumenServicios()])
      .then(([s, r, m]) => { setSitios(s); setReservas(r); setResumen(m); })
      .catch(() => {})
      .finally(() => setCargandoDatos(false));
  };
  const cargarDatos = () => { setCargandoDatos(true); traerDatos(); };

  useEffect(() => {
    api.miPerfilPrestador()
      .then(setPerfil)
      .catch(() => setPerfil(null))
      .finally(() => setCargandoPerfil(false));
  }, []);
  useEffect(() => { if (perfil?.estado_verificacion === "aprobado") traerDatos(); }, [perfil]);

  // Ubicación del último servicio con coordenadas, para precargarla al crear uno nuevo.
  const ubicacionPrevia = [...sitios].sort((a, b) => b.id - a.id).find((s) => s.latitud && s.longitud);

  const ejecutar = async (id, fn) => {
    setAccionando(id);
    try {
      await fn();
      cargarDatos();
    } catch (err) {
      avisar(err.message);
    } finally {
      setAccionando(null);
    }
  };

  const handleAccionReserva = (id, accion, motivo) =>
    ejecutar(id, () => {
      if (accion === "confirmar") return api.confirmarReserva(id);
      if (accion === "asistio" || accion === "no_asistio") return api.registrarAsistencia(id, accion === "asistio");
      return api.rechazarReserva(id, motivo);
    });

  const eliminarServicio = async (s) => {
    if (!(await confirmar(`¿Eliminar "${s.nombre}"? Dejará de aparecer en el catálogo. Su historial de reservas y reseñas se conserva.`, { titulo: "Eliminar servicio", confirmar: "Eliminar", peligro: true }))) return;
    return ejecutar(s.id, () => api.eliminarSitio(s.id));
  };

  const togglePausa = (s) =>
    ejecutar(s.id, () => api.actualizarSitio(s.id, {
      nombre: s.nombre, categoria: s.categoria, municipio: s.municipio,
      precio: s.precio, horario: s.horario, descripcion: s.descripcion,
      tipo_viaje: s.tipo_viaje, estado: s.estado === "activo" ? "inactivo" : "activo",
      latitud: s.latitud || "", longitud: s.longitud || "",
    }));

  if (cargandoPerfil) {
    return <p className="max-w-[1360px] mx-auto px-gutter py-space-xl font-body-md text-body-md text-on-surface-variant">Cargando...</p>;
  }
  if (!perfil) return <FormularioPerfil onCreado={setPerfil} />;
  // Etapa 2: perfil por completar (o corregir si fue rechazado) antes de enviarlo a revisión
  if (perfil.estado_verificacion === "incompleto" || perfil.estado_verificacion === "rechazado") {
    return <CompletarPerfil perfil={perfil} onActualizado={setPerfil} />;
  }
  if (perfil.estado_verificacion !== "aprobado") return <EstadoVerificacion perfil={perfil} />;

  return (
    <div className="max-w-[1360px] mx-auto px-gutter py-space-xl flex flex-col gap-8">
      <section className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="relative w-14 h-14 rounded-2xl bg-gradient-to-br from-primary-container to-secondary flex items-center justify-center shadow-md shrink-0">
            <span className="material-symbols-outlined text-on-primary text-[26px]">storefront</span>
            <span className="absolute -bottom-1 -right-1 bg-secondary text-on-secondary w-5 h-5 rounded-full flex items-center justify-center shadow">
              <span className="material-symbols-outlined text-[13px]">verified</span>
            </span>
          </div>
          <div>
            <span className="font-label-xs text-label-xs uppercase tracking-wider text-secondary font-bold">Portal del Prestador</span>
            <h1 className="font-headline-md text-headline-md text-on-surface font-semibold tracking-tight">{perfil.nombre_negocio}</h1>
            <p className="font-body-sm text-body-sm text-on-surface-variant flex items-center gap-1.5 mt-0.5">
              <span className="material-symbols-outlined text-[16px] text-primary">place</span>
              <span>{perfil.municipio} · {perfil.categoria}</span>
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => scrollTo("servicios")} className="px-4 py-2 rounded-xl bg-surface-container text-on-surface font-label-md text-label-md hover:bg-surface-container-high transition-colors flex items-center gap-1.5">
            <span className="material-symbols-outlined text-[18px]">cabin</span>
            <span>Mis Servicios</span>
          </button>
          <button onClick={() => scrollTo("reservas")} className="px-4 py-2 rounded-xl bg-surface-container text-on-surface font-label-md text-label-md hover:bg-surface-container-high transition-colors flex items-center gap-1.5">
            <span className="material-symbols-outlined text-[18px]">confirmation_number</span>
            <span>Reservas</span>
          </button>
        </div>
      </section>

      <ContactoWhatsApp key={perfil.telefono || ""} perfil={perfil} onActualizado={setPerfil} />
      <KpisPrestador reservas={reservas} sitios={sitios} />
      <TablaServicios
        sitios={sitios}
        resumen={resumen}
        cargando={cargandoDatos}
        accionando={accionando}
        onNuevo={() => setSitioModal(null)}
        onEditar={setSitioModal}
        onTogglePausa={togglePausa}
        onEliminar={eliminarServicio}
      />
      <PaquetesPrestador sitios={sitios} />
      <ReservasRecibidas reservas={reservas} cargando={cargandoDatos} accionando={accionando} onAccion={handleAccionReserva} />
      <EstadisticasPrestador />
      <ResenasRecibidas />

      {sitioModal !== undefined && (
        <ModalServicio
          perfil={perfil}
          sitio={sitioModal}
          ubicacionPrevia={ubicacionPrevia}
          onCerrar={() => setSitioModal(undefined)}
          onGuardado={() => { setSitioModal(undefined); cargarDatos(); }}
        />
      )}
    </div>
  );
}
