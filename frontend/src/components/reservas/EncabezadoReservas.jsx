import { urlImagen } from "../../api/client";
import { CATEGORIA_ICONOS } from "../../constants";

function Cifra({ etiqueta, valor, color }) {
  return (
    <div className="bg-surface-container-lowest px-space-md py-space-xs rounded-xl flex flex-col">
      <span className="font-label-xs text-label-xs text-outline">{etiqueta}</span>
      <span className={`font-title-sm text-title-sm font-bold ${color}`}>{valor}</span>
    </div>
  );
}

// Saludo y tres cifras reales del viajero.
export function ResumenViajero({ nombre, proximaFecha, totalConfirmado, totalReservas }) {
  return (
    <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-space-lg pb-space-lg">
      <div className="space-y-space-xs max-w-2xl">
        <div className="inline-flex items-center gap-space-xs px-space-md py-space-xs rounded-full bg-surface-container-high text-secondary font-label-xs text-label-xs uppercase tracking-widest">
          <span className="w-2 h-2 rounded-full bg-secondary animate-pulse" />
          Portal del Viajero
        </div>
        <h1 className="font-headline-xl text-headline-xl text-primary font-bold tracking-tight">
          {nombre ? `¡Hola, ${nombre}!` : "Mis Reservas"}
        </h1>
        <p className="font-body-lg text-body-lg text-on-surface-variant">
          Consulta el estado real de tus solicitudes de reserva con los prestadores del Caquetá.
        </p>
      </div>
      <div className="grid grid-cols-3 gap-space-sm bg-surface-container-low p-space-sm rounded-2xl shadow-sm self-start lg:self-auto">
        <Cifra etiqueta="Próxima confirmada" valor={proximaFecha || "—"} color="text-primary" />
        <Cifra etiqueta="Total confirmado" valor={`$${totalConfirmado.toLocaleString("es-CO")}`} color="text-secondary" />
        <Cifra etiqueta="Reservas totales" valor={totalReservas} color="text-on-tertiary-container" />
      </div>
    </div>
  );
}

// El próximo viaje confirmado, solo con datos reales (sin inventar guía, clima ni cronograma).
export function ProximoViaje({ reserva }) {
  return (
    <div className="mb-space-lg relative overflow-hidden rounded-3xl bg-gradient-to-br from-primary-container to-secondary text-on-primary p-space-lg shadow-[0_12px_36px_-6px_rgba(6,78,59,0.2)] flex flex-col sm:flex-row sm:items-center justify-between gap-space-md">
      <div className="flex items-center gap-space-md">
        <div className="w-14 h-14 rounded-2xl overflow-hidden bg-surface-container-lowest/15 backdrop-blur-md flex items-center justify-center shrink-0">
          {reserva.sitio?.imagen_url ? (
            <img src={urlImagen(reserva.sitio.imagen_url)} alt="" className="w-full h-full object-cover" />
          ) : (
            <span className="material-symbols-outlined text-[28px]">{CATEGORIA_ICONOS[reserva.sitio?.categoria] || "place"}</span>
          )}
        </div>
        <div>
          <span className="font-label-xs text-label-xs uppercase tracking-widest text-tertiary-fixed font-semibold">Tu próximo viaje confirmado</span>
          <h2 className="font-title-lg text-title-lg font-bold">{reserva.paquete?.nombre || reserva.sitio?.nombre}</h2>
          <div className="flex flex-wrap items-center gap-x-space-md gap-y-1 font-body-sm text-body-sm text-on-primary-container mt-1">
            <span className="flex items-center gap-1">
              <span className="material-symbols-outlined text-[16px]">calendar_today</span>
              {reserva.fecha_servicio}
            </span>
            <span className="flex items-center gap-1">
              <span className="material-symbols-outlined text-[16px]">location_on</span>
              {reserva.sitio?.municipio}, Caquetá
            </span>
            {reserva.prestador && (
              <span className="flex items-center gap-1">
                <span className="material-symbols-outlined text-[16px]">storefront</span>
                {reserva.prestador.nombre_negocio}
              </span>
            )}
          </div>
        </div>
      </div>
      <div className="text-right shrink-0">
        <span className="font-label-xs text-label-xs text-tertiary-fixed uppercase block">Valor</span>
        <span className="font-title-lg text-title-lg font-bold">
          {Number(reserva.total) === 0 ? "Gratuito" : Number(reserva.total).toLocaleString("es-CO")}
        </span>
      </div>
    </div>
  );
}
