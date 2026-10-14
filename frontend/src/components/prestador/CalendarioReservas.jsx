import { useMemo, useState } from "react";
import { hoyISO } from "../../utils/fechas";

const DIAS = ["L", "M", "M", "J", "V", "S", "D"];
const NOMBRES_MES = ["enero", "febrero", "marzo", "abril", "mayo", "junio", "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre"];
const ETIQUETA = { pendiente: "Pendiente", confirmada: "Confirmada", completada: "Completada" };

const claveMes = (a, m) => `${a}-${String(m).padStart(2, "0")}`;
// Las rechazadas y canceladas no ocupan el día: no se dibujan en el calendario.
const cuenta = (r) => r.estado === "pendiente" || r.estado === "confirmada" || r.estado === "completada";

// Mes que se abre primero: el de la próxima reserva que viene, o el actual.
function mesInicial(reservas) {
  const proxima = reservas.filter((r) => cuenta(r) && r.fecha_servicio >= hoyISO()).map((r) => r.fecha_servicio).sort()[0];
  const base = proxima || hoyISO();
  return { anio: Number(base.slice(0, 4)), mes: Number(base.slice(5, 7)) };
}

// Calendario mensual con las reservas recibidas: cada día muestra cuántas están pendientes y cuántas confirmadas.
export default function CalendarioReservas({ reservas }) {
  const [{ anio, mes }, setMesActual] = useState(() => mesInicial(reservas));
  const [seleccionado, setSeleccionado] = useState(null);

  const porFecha = useMemo(() => {
    const mapa = new Map();
    for (const r of reservas.filter(cuenta)) mapa.set(r.fecha_servicio, [...(mapa.get(r.fecha_servicio) || []), r]);
    return mapa;
  }, [reservas]);

  const cambiarMes = (delta) => {
    const f = new Date(anio, mes - 1 + delta, 1);
    setMesActual({ anio: f.getFullYear(), mes: f.getMonth() + 1 });
    setSeleccionado(null);
  };

  const primerDia = (new Date(anio, mes - 1, 1).getDay() + 6) % 7; // lunes = 0
  const hoy = hoyISO();
  const delDia = seleccionado ? porFecha.get(seleccionado) || [] : [];

  return (
    <div className="flex flex-col gap-4" aria-label="Calendario de reservas recibidas">
      <div className="flex items-center justify-between">
        <button type="button" aria-label="Mes anterior" onClick={() => cambiarMes(-1)} className="w-9 h-9 rounded-full hover:bg-surface-container flex items-center justify-center">
          <span className="material-symbols-outlined">chevron_left</span>
        </button>
        <span className="font-title-md text-title-md text-on-surface font-semibold capitalize">{NOMBRES_MES[mes - 1]} {anio}</span>
        <button type="button" aria-label="Mes siguiente" onClick={() => cambiarMes(1)} className="w-9 h-9 rounded-full hover:bg-surface-container flex items-center justify-center">
          <span className="material-symbols-outlined">chevron_right</span>
        </button>
      </div>

      <div className="grid grid-cols-7 gap-1.5 text-center">
        {DIAS.map((d, i) => <span key={i} className="font-label-xs text-label-xs text-outline font-semibold">{d}</span>)}
        {Array.from({ length: primerDia }, (_, i) => <span key={`v${i}`} />)}
        {Array.from({ length: new Date(anio, mes, 0).getDate() }, (_, i) => {
          const fecha = `${claveMes(anio, mes)}-${String(i + 1).padStart(2, "0")}`;
          const delaFecha = porFecha.get(fecha) || [];
          const pendientes = delaFecha.filter((r) => r.estado === "pendiente").length;
          const confirmadas = delaFecha.length - pendientes;
          const detalle = delaFecha.length
            ? `${pendientes} pendiente(s), ${confirmadas} confirmada(s)`
            : "sin reservas";
          return (
            <button
              key={fecha}
              type="button"
              onClick={() => setSeleccionado(fecha === seleccionado ? null : fecha)}
              aria-label={`${i + 1} de ${NOMBRES_MES[mes - 1]}: ${detalle}`}
              aria-pressed={fecha === seleccionado}
              data-fecha={fecha}
              className={`min-h-[3.25rem] rounded-xl p-1 flex flex-col items-center gap-0.5 font-label-md text-label-md transition-colors ${
                fecha === seleccionado ? "bg-primary text-on-primary" : delaFecha.length ? "bg-surface-container hover:bg-surface-container-high text-on-surface" : "hover:bg-surface-container-low text-on-surface-variant"
              } ${fecha === hoy ? "ring-2 ring-secondary" : ""}`}
            >
              <span>{i + 1}</span>
              <span className="flex gap-1">
                {pendientes > 0 && <span data-tipo="pendientes" className="px-1.5 rounded-full bg-tertiary-fixed text-on-tertiary-fixed-variant font-label-xs text-label-xs font-bold">{pendientes}</span>}
                {confirmadas > 0 && <span data-tipo="confirmadas" className="px-1.5 rounded-full bg-secondary-container text-on-secondary-container font-label-xs text-label-xs font-bold">{confirmadas}</span>}
              </span>
            </button>
          );
        })}
      </div>

      <div className="flex flex-wrap gap-4 font-label-xs text-label-xs text-on-surface-variant">
        <span className="inline-flex items-center gap-1.5"><span className="w-3 h-3 rounded-full bg-tertiary-fixed" /> Pendientes de responder</span>
        <span className="inline-flex items-center gap-1.5"><span className="w-3 h-3 rounded-full bg-secondary-container" /> Confirmadas o completadas</span>
      </div>

      {seleccionado && (
        <div className="p-4 rounded-xl bg-surface-container-low flex flex-col gap-2" role="region" aria-label={`Reservas del ${seleccionado}`}>
          <h3 className="font-title-sm text-title-sm text-on-surface font-semibold">{seleccionado}</h3>
          {delDia.length === 0 ? (
            <p className="font-body-sm text-body-sm text-on-surface-variant">No hay reservas ese día.</p>
          ) : (
            <ul className="flex flex-col gap-2">
              {delDia.map((r) => (
                <li key={r.id} className="flex flex-wrap items-center justify-between gap-2 font-body-sm text-body-sm">
                  <span className="text-on-surface">
                    <strong>{r.turista?.nombre || "Turista"}</strong> · {r.paquete ? `Paquete ${r.paquete.nombre}` : r.sitio?.nombre} · {r.personas} persona{r.personas === 1 ? "" : "s"}
                  </span>
                  <span className={`font-label-xs text-label-xs font-semibold ${r.estado === "pendiente" ? "text-on-tertiary-container" : "text-secondary"}`}>{ETIQUETA[r.estado]}</span>
                </li>
              ))}
            </ul>
          )}
          {delDia.some((r) => r.estado === "pendiente") && (
            <p className="font-label-xs text-label-xs text-on-surface-variant">Confirma o rechaza las pendientes desde la vista de lista.</p>
          )}
        </div>
      )}
    </div>
  );
}
