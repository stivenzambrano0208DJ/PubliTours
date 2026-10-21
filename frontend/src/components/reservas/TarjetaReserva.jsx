import { Link } from "react-router-dom";
import { urlImagen } from "../../api/client";
import { CATEGORIA_ICONOS } from "../../constants";
import { Estrellas } from "../Estrellas";
import { ESTADO_UI } from "../../utils/estadosReserva";
import { hoyISO, sumarDias } from "../../utils/fechas";
import { descargarIcs } from "../../utils/calendario";
import BotonPreguntar from "../mensajes/BotonPreguntar";

const BOTON = "self-start mt-space-xs inline-flex items-center gap-1.5 px-4 py-2 rounded-xl font-label-md text-label-md font-semibold transition-colors";

// Aviso con icono: lo que el turista debe saber del estado de su reserva.
function Aviso({ icono, fondo, colorIcono, children }) {
  return (
    <div className={`mt-space-xs p-space-sm ${fondo} rounded-xl flex items-start gap-space-xs`}>
      <span className={`material-symbols-outlined ${colorIcono} text-[20px] shrink-0 mt-0.5`}>{icono}</span>
      <span className="font-body-sm text-body-sm text-on-surface-variant">{children}</span>
    </div>
  );
}

function Dato({ icono, children }) {
  return (
    <div className="flex items-center gap-1.5 font-body-sm text-body-sm">
      <span className="material-symbols-outlined text-outline text-[18px]">{icono}</span>
      <span>{children}</span>
    </div>
  );
}

// Una reserva del turista con lo que puede hacer según su estado: ver comprobante, modificar, cancelar o calificar.
export default function TarjetaReserva({ reserva: r, diasGracia, cancelando, onEditar, onCancelar, onCalificar }) {
  const ui = ESTADO_UI[r.estado];
  const hoy = hoyISO();
  const esFutura = r.fecha_servicio > hoy;
  const gratis = Number(r.total) === 0;

  return (
    <article className="bg-surface-container-lowest rounded-3xl p-space-lg shadow-[0_4px_24px_-2px_rgba(6,78,59,0.06)] hover:shadow-[0_20px_36px_-8px_rgba(6,78,59,0.12)] transition-all duration-300 relative overflow-hidden flex flex-col gap-space-md">
      <div className={`absolute top-0 left-0 bottom-0 w-2 ${ui.barra}`} />

      <div className="flex flex-wrap items-center justify-between gap-space-sm pl-space-xs">
        <div className="flex items-center gap-space-sm">
          <span className={`inline-flex items-center gap-1.5 px-space-md py-1 rounded-full font-label-md text-label-md font-semibold ${ui.chip}`}>
            <span className="material-symbols-outlined text-[16px]">{ui.icon}</span>
            {ui.label}
          </span>
          <span className="font-label-xs text-label-xs text-outline tracking-wider font-mono">#RES-{r.id}</span>
        </div>
        <div className="text-right">
          <span className="font-label-xs text-label-xs text-outline uppercase block">Valor</span>
          <div className="flex items-baseline gap-1">
            <span className="font-title-lg text-title-lg text-primary font-bold">{gratis ? "Gratuito" : Number(r.total).toLocaleString("es-CO")}</span>
            {!gratis && <span className="font-label-xs text-label-xs text-on-surface-variant font-medium">COP</span>}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-12 gap-space-md items-center pl-space-xs">
        <div className="sm:col-span-3 relative rounded-2xl overflow-hidden aspect-[4/3] bg-gradient-to-br from-primary-container to-secondary flex items-center justify-center">
          {r.sitio?.imagen_url ? (
            <img loading="lazy" decoding="async" src={urlImagen(r.sitio.imagen_url)} alt="" className="w-full h-full object-cover" />
          ) : (
            <span className="material-symbols-outlined text-on-primary text-[36px] opacity-80">{CATEGORIA_ICONOS[r.sitio?.categoria] || "place"}</span>
          )}
        </div>

        <div className="sm:col-span-9 flex flex-col gap-space-xs">
          <div className="flex items-center gap-1.5 text-secondary font-label-xs text-label-xs font-semibold">
            <span className="material-symbols-outlined text-[16px]">location_on</span>
            <span>{r.sitio?.municipio}, Caquetá</span>
          </div>
          <h2 className="font-title-lg text-title-lg text-primary font-bold">
            {r.paquete && (
              <span className="mr-2 align-middle inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-secondary-container/50 text-secondary font-label-xs text-label-xs font-bold uppercase">
                <span className="material-symbols-outlined text-[13px]">inventory_2</span>Paquete
              </span>
            )}
            {r.paquete?.nombre || r.sitio?.nombre}
          </h2>
          {r.paquete && <p className="font-label-xs text-label-xs text-on-surface-variant">Incluye: {r.paquete.items.map((i) => i.sitio?.nombre).join(" + ")}</p>}

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-space-xs pt-space-xs text-on-surface-variant">
            <Dato icono="calendar_today">{r.fecha_servicio}</Dato>
            <Dato icono="category">{r.sitio?.categoria}</Dato>
            <Dato icono="group">{r.personas} persona{r.personas === 1 ? "" : "s"}</Dato>
            <Dato icono="event_available">Solicitada: {new Date(r.fecha_solicitud).toLocaleDateString("es-CO")}</Dato>
          </div>

          {r.prestador && (
            <div className="mt-space-xs p-space-xs px-space-sm bg-surface-container-low rounded-xl flex items-center gap-space-xs">
              <span className="material-symbols-outlined text-secondary text-[18px]">storefront</span>
              <span className="font-label-xs text-label-xs text-on-surface font-medium">
                Prestador: <strong className="text-primary font-semibold">{r.prestador.nombre_negocio}</strong>
              </span>
            </div>
          )}

          {r.estado === "pendiente" && (
            <Aviso icono="info" fondo="bg-amber-50/70" colorIcono="text-on-tertiary-container">
              Esperando confirmación del prestador. Te notificaremos cuando responda.
            </Aviso>
          )}
          {r.estado === "cancelada" && (
            <Aviso icono="event_busy" fondo="bg-surface-container" colorIcono="text-outline">
              Cancelaste esta reserva.{r.cancelacion_tardia && " Se registró como cancelación tardía."}
            </Aviso>
          )}
          {r.estado === "rechazada" && (
            <Aviso icono="error" fondo="bg-error-container/40" colorIcono="text-error">
              {r.motivo_rechazo ? `Motivo del prestador: ${r.motivo_rechazo}` : "El prestador no pudo confirmar esta solicitud."}
            </Aviso>
          )}
          {r.estado === "no_asistio" && (
            <Aviso icono="person_off" fondo="bg-error-container/40" colorIcono="text-error">
              El prestador registró que no asististe. Si crees que es un error, comunícate con el negocio.
            </Aviso>
          )}
          {r.estado === "confirmada" && !esFutura && (
            <Aviso icono="pending_actions" fondo="bg-surface-container" colorIcono="text-outline">
              El prestador está registrando tu asistencia. Podrás calificar cuando la confirme
              {diasGracia ? ` o, a más tardar, el ${sumarDias(r.fecha_servicio, diasGracia)}` : ""}.
            </Aviso>
          )}

          {(r.estado === "confirmada" || r.estado === "completada") && (
            <Link to={`/comprobante/${r.id}`} className={`${BOTON} bg-primary-container text-on-primary hover:bg-secondary`}>
              <span className="material-symbols-outlined text-[18px]">qr_code_2</span>
              Ver comprobante · {r.codigo}
            </Link>
          )}
          {["pendiente", "confirmada", "completada"].includes(r.estado) && (
            <BotonPreguntar tema={{ reserva_id: r.id }} etiqueta="Escribir al negocio" nombre={r.paquete?.nombre || r.sitio?.nombre} className="self-start mt-space-xs" />
          )}
          {r.estado === "confirmada" && esFutura && (
            <button onClick={() => descargarIcs(r)} className={`${BOTON} bg-surface-container text-on-surface hover:bg-surface-container-high`}>
              <span className="material-symbols-outlined text-[18px]" aria-hidden="true">event</span>
              Agregar al calendario
            </button>
          )}
          {(r.estado === "pendiente" || r.estado === "confirmada") && esFutura && (
            <>
              <button onClick={() => onEditar(r)} className={`${BOTON} bg-surface-container text-on-surface hover:bg-surface-container-high`}>
                <span className="material-symbols-outlined text-[18px]">edit_calendar</span>
                Modificar reserva
              </button>
              <button onClick={() => onCancelar(r)} disabled={cancelando} className={`${BOTON} bg-surface-container text-error hover:bg-error-container disabled:opacity-60`}>
                <span className="material-symbols-outlined text-[18px]">event_busy</span>
                {cancelando ? "Cancelando..." : "Cancelar reserva"}
              </button>
            </>
          )}
          {r.estado === "completada" && !esFutura && (
            r.resena ? (
              <div className="mt-space-xs p-space-sm bg-surface-container-low rounded-xl flex items-center gap-space-xs">
                <Estrellas valor={r.resena.calificacion} tamano={18} />
                <span className="font-label-xs text-label-xs text-on-surface-variant">Tu calificación</span>
              </div>
            ) : (
              <button onClick={() => onCalificar(r)} className={`${BOTON} bg-primary text-on-primary hover:bg-primary-container`}>
                <span className="material-symbols-outlined text-[18px]">star</span>
                Calificar experiencia
              </button>
            )
          )}
        </div>
      </div>
    </article>
  );
}
