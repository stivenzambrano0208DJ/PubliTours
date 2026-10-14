import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../../api/client";
import ModalPaquete from "./ModalPaquete";
import { pesos } from "../../utils/moneda";


// Sección del Portal del Prestador para armar paquetes con sus propios servicios.
export default function PaquetesPrestador({ sitios }) {
  const [paquetes, setPaquetes] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [modal, setModal] = useState(undefined); // undefined = cerrado, null = nuevo, objeto = editar
  const [accionando, setAccionando] = useState(null);

  const cargar = () => api.misPaquetes().then(setPaquetes).catch(() => {}).finally(() => setCargando(false));
  useEffect(() => { cargar(); }, [sitios]);

  const ejecutar = async (id, fn) => {
    setAccionando(id);
    try { await fn(); await cargar(); } catch (err) { alert(err.message); } finally { setAccionando(null); }
  };

  const eliminar = (p) => {
    if (!window.confirm(`¿Eliminar el paquete "${p.nombre}"? Su historial de reservas se conserva.`)) return;
    return ejecutar(p.id, () => api.eliminarPaquete(p.id));
  };

  return (
    <section id="paquetes" className="w-full bg-surface-container-lowest rounded-2xl shadow-sm overflow-hidden scroll-mt-24">
      <div className="p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div>
          <h2 className="font-title-lg text-title-lg text-on-surface font-semibold">Mis paquetes</h2>
          <p className="font-body-sm text-body-sm text-on-surface-variant">Combina varios de tus servicios en una sola reserva con precio especial.</p>
        </div>
        <button onClick={() => setModal(null)} className="bg-primary-container hover:bg-secondary text-on-primary font-label-md text-label-md px-4 py-2 rounded-xl flex items-center gap-2 shadow-sm transition-all">
          <span className="material-symbols-outlined text-[18px]">add_circle</span>
          <span>Crear paquete</span>
        </button>
      </div>

      {!cargando && paquetes.length === 0 && (
        <p className="px-5 pb-5 font-body-sm text-body-sm text-on-surface-variant">
          Aún no tienes paquetes. Por ejemplo: hospedaje + cabalgata + almuerzo como "Fin de semana en la finca".
        </p>
      )}

      {paquetes.length > 0 && (
        <div className="px-5 pb-5 flex flex-col gap-3">
          {paquetes.map((p) => (
            <article key={p.id} className="p-4 rounded-xl bg-surface-container-low flex flex-col lg:flex-row lg:items-center justify-between gap-3">
              <div className="flex flex-col gap-1 min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <Link to={`/paquetes/${p.id}`} className="font-title-sm text-title-sm text-on-surface font-semibold hover:text-secondary transition-colors">{p.nombre}</Link>
                  <span className={`px-2.5 py-0.5 rounded-full font-label-xs text-label-xs font-semibold ${p.estado === "activo" ? "bg-secondary-container/50 text-on-secondary-container" : "bg-surface-container-high text-on-surface-variant"}`}>
                    {p.estado === "activo" ? "Publicado" : p.estado === "oculto" ? "Oculto por el administrador" : "Pausado"}
                  </span>
                </div>
                {p.estado === "oculto" && p.motivo_moderacion && (
                  <p className="font-label-xs text-label-xs text-error">Motivo: {p.motivo_moderacion}</p>
                )}
                <p className="font-label-xs text-label-xs text-outline">
                  {p.items.map((i) => i.sitio?.nombre).join(" + ")}
                </p>
                <p className="font-body-sm text-body-sm text-on-surface-variant">
                  <strong className="text-primary">{pesos(p.precio)}</strong> por persona
                  {p.ahorro > 0 && <> · el turista ahorra {pesos(p.ahorro)}</>}
                  {p.capacidad ? <> · {p.capacidad} cupos por día</> : null}
                </p>
              </div>
              <div className="flex items-center gap-1 shrink-0">
                <button onClick={() => setModal(p)} title="Editar" className="p-1.5 text-on-surface-variant hover:text-primary hover:bg-surface-container rounded-lg transition-colors">
                  <span className="material-symbols-outlined text-[18px]">edit</span>
                </button>
                {p.estado !== "oculto" && <button
                  onClick={() => ejecutar(p.id, () => api.estadoPaquete(p.id, p.estado === "activo" ? "inactivo" : "activo"))}
                  disabled={accionando === p.id}
                  title={p.estado === "activo" ? "Pausar" : "Publicar"}
                  className="p-1.5 text-on-surface-variant hover:text-secondary hover:bg-surface-container rounded-lg transition-colors disabled:opacity-50"
                >
                  <span className="material-symbols-outlined text-[18px]">{p.estado === "activo" ? "pause_circle" : "play_circle"}</span>
                </button>}
                <button onClick={() => eliminar(p)} disabled={accionando === p.id} title="Eliminar paquete" className="p-1.5 text-on-surface-variant hover:text-error hover:bg-error-container/40 rounded-lg transition-colors disabled:opacity-50">
                  <span className="material-symbols-outlined text-[18px]">delete</span>
                </button>
              </div>
            </article>
          ))}
        </div>
      )}

      {modal !== undefined && (
        <ModalPaquete
          paquete={modal}
          sitios={sitios}
          onCerrar={() => setModal(undefined)}
          onGuardado={() => { setModal(undefined); cargar(); }}
        />
      )}
    </section>
  );
}
