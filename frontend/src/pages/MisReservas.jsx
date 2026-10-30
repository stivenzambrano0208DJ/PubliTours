import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/auth";
import { useMisReservas } from "../hooks/useMisReservas";
import ModalCalificar from "../components/reservas/ModalCalificar";
import EditarReserva from "../components/reservas/EditarReserva";
import { ResumenViajero, ProximoViaje } from "../components/reservas/EncabezadoReservas";
import FiltrosReservas from "../components/reservas/FiltrosReservas";
import TarjetaReserva from "../components/reservas/TarjetaReserva";
import PanelAyudaReservas from "../components/reservas/PanelAyudaReservas";
import ModalProblema from "../components/reservas/ModalProblema";
import MisCasos from "../components/reservas/MisCasos";
import { useIdioma } from "../context/idioma";
import Boton from "../components/ui/Boton";

// Las reservas del turista: estado real de cada solicitud y lo que puede hacer con ella. La lógica vive en useMisReservas.
export default function MisReservas() {
  const { t } = useIdioma();
  const { usuario } = useAuth();
  const navigate = useNavigate();
  const mis = useMisReservas();
  const [editando, setEditando] = useState(null);
  const [calificando, setCalificando] = useState(null);
  const [problema, setProblema] = useState(null);
  const [casos, setCasos] = useState(0); // cambia al abrir un caso, para recargar «Mis casos de soporte»

  return (
    <div className="w-full max-w-[1360px] mx-auto px-margin-mobile md:px-margin py-space-xl">
      <section className="mb-space-xl">
        <ResumenViajero
          nombre={usuario?.nombre}
          proximaFecha={mis.proximaReserva?.fecha_servicio}
          totalConfirmado={mis.totalConfirmado}
          totalReservas={mis.reservas.length}
        />
        {mis.proximaReserva && <ProximoViaje reserva={mis.proximaReserva} />}
        <FiltrosReservas filtro={mis.filtro} onFiltro={mis.setFiltro} conteos={mis.conteos} busqueda={mis.busqueda} onBusqueda={mis.setBusqueda} />
      </section>

      {mis.cargando && <p className="font-body-md text-body-md text-on-surface-variant">{t("Cargando...")}</p>}
      {mis.error && <p className="text-error font-body-sm text-body-sm">{mis.error}</p>}

      {!mis.cargando && !mis.error && (
        <section className="grid grid-cols-1 lg:grid-cols-12 gap-space-xl items-start">
          <div className="lg:col-span-8 flex flex-col gap-space-lg">
            {mis.visibles.length === 0 && (
              <div className="bg-surface-container-lowest rounded-3xl p-space-xl text-center">
                <p className="font-body-md text-body-md text-on-surface-variant">
                  {mis.reservas.length === 0
                    ? t("Aún no tienes reservas. Genera un itinerario y reserva alguna experiencia.")
                    : t("No hay reservas que coincidan con el filtro.")}
                </p>
                {mis.reservas.length === 0 && (
                  <Boton
                    onClick={() => navigate("/itinerario")}
                    className="mt-space-md inline-flex items-center gap-2 px-space-lg py-3 transition-all"
                  >
                    <span className="material-symbols-outlined text-[18px]">auto_awesome</span>
                    <span>{t("Generar itinerario")}</span>
                  </Boton>
                )}
              </div>
            )}

            {mis.visibles.map((r) => (
              <TarjetaReserva
                key={r.id}
                reserva={r}
                diasGracia={mis.diasGracia}
                cancelando={mis.cancelando === r.id}
                onEditar={setEditando}
                onCancelar={mis.cancelar}
                onCalificar={setCalificando}
                onProblema={setProblema}
              />
            ))}
            <MisCasos version={casos} />
          </div>

          <PanelAyudaReservas />
        </section>
      )}

      {editando && (
        <EditarReserva
          reserva={editando}
          onCerrar={() => setEditando(null)}
          onGuardada={(actualizada) => { mis.actualizar(editando.id, actualizada); setEditando(null); }}
        />
      )}
      {calificando && (
        <ModalCalificar
          reserva={calificando}
          onCerrar={() => setCalificando(null)}
          onGuardado={(resena) => { mis.actualizar(calificando.id, { resena }); setCalificando(null); }}
        />
      )}
      {problema && <ModalProblema reserva={problema} onCerrar={() => setProblema(null)} onAbierto={() => setCasos((v) => v + 1)} />}
    </div>
  );
}
