import { useEffect, useState } from "react";
import { api } from "../../api/client";
import { tieneTarifaAvanzada } from "../../utils/catalogo";
import { fechaMinima } from "../../constants";
import CalendarioDisponibilidad from "./CalendarioDisponibilidad";
import { pesos } from "../../utils/moneda";
import { CAMPO_ANCHO } from "../../estilos";
import { useIdioma } from "../../context/idioma";

const CAMPO_RESERVA = `mt-1.5 ${CAMPO_ANCHO}`;

// Campos comunes del formulario de reserva: fecha (con calendario de disponibilidad y aviso de días sin atención),
// personas (y niños si el servicio tiene tarifa de niños), total estimado y una nota para el prestador.
// Para un paquete se pasan sus propias funciones de carga y `cotizar={null}` (el paquete cobra un precio por persona).
export default function CamposReserva({
  sitio, valores, onCambio,
  cargarFechas = api.fechasBloqueadas,
  cargarDisponibilidad = (mes) => api.disponibilidadSitio(sitio.id, mes),
  cotizar = api.cotizarSitio,
}) {
  const { t } = useIdioma();
  const [bloqueadas, setBloqueadas] = useState([]);
  const [verCalendario, setVerCalendario] = useState(false);
  const [cotizacion, setCotizacion] = useState(null);

  useEffect(() => {
    cargarFechas(sitio.id).then(setBloqueadas).catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sitio.id]);

  const personas = Math.max(1, Number(valores.personas) || 1);
  const ninos = Math.min(Math.max(0, Number(valores.ninos) || 0), personas - 1);
  const avanzada = Boolean(cotizar) && tieneTarifaAvanzada(sitio);
  const mostrarNinos = Boolean(cotizar) && (sitio.precio_nino != null || sitio.tarifas?.some((t) => t.precio_nino != null) || sitio.tiene_temporadas);

  // El total de un servicio con tarifas avanzadas lo calcula el servidor (misma regla que usará al reservar).
  useEffect(() => {
    if (!avanzada || !valores.fecha) { setCotizacion(null); return undefined; }
    let vigente = true;
    const t = setTimeout(() => {
      cotizar(sitio.id, { fecha: valores.fecha, personas, ninos }).then((c) => vigente && setCotizacion(c)).catch(() => vigente && setCotizacion(null));
    }, 250);
    return () => { vigente = false; clearTimeout(t); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [avanzada, valores.fecha, personas, ninos, sitio.id]);

  const bloqueo = bloqueadas.find((b) => b.fecha === valores.fecha);
  const total = avanzada && cotizacion ? cotizacion.total : Number(sitio.precio) * personas;

  return (
    <>
      <div>
        <label className="font-label-md text-label-md text-on-surface">
          {t("Fecha del servicio")}
          <input
            type="date"
            required
            min={fechaMinima()}
            value={valores.fecha}
            onChange={(e) => onCambio({ ...valores, fecha: e.target.value })}
            className={CAMPO_RESERVA}
          />
        </label>
        <button type="button" onClick={() => setVerCalendario((v) => !v)} aria-expanded={verCalendario} className="mt-1.5 inline-flex items-center gap-1 font-label-xs text-label-xs text-secondary font-semibold hover:underline">
          <span className="material-symbols-outlined text-[16px]">calendar_month</span>
          {verCalendario ? t("Ocultar calendario") : t("Ver calendario de disponibilidad")}
        </button>
      </div>
      {verCalendario && (
        <CalendarioDisponibilidad
          cargar={cargarDisponibilidad}
          seleccionada={valores.fecha}
          onElegir={(fecha) => onCambio({ ...valores, fecha })}
        />
      )}
      {bloqueo && (
        <p className="flex items-start gap-1.5 text-error font-body-sm text-body-sm">
          <span className="material-symbols-outlined text-[18px] shrink-0">event_busy</span>
          {bloqueo.motivo ? t("El prestador no atiende ese día ({motivo}). Elige otra fecha.", { motivo: bloqueo.motivo }) : t("El prestador no atiende ese día. Elige otra fecha.")}
        </p>
      )}

      <div className={mostrarNinos ? "grid grid-cols-2 gap-3" : ""}>
        <label className="font-label-md text-label-md text-on-surface">
          {t("Número de personas")}
          <input
            type="number"
            required
            min={1}
            max={sitio.capacidad || 500}
            value={valores.personas}
            onChange={(e) => onCambio({ ...valores, personas: e.target.value })}
            className={CAMPO_RESERVA}
          />
          {sitio.capacidad && <span className="font-label-xs text-label-xs text-on-surface-variant">{t("Cupo máximo: {n} personas por día.", { n: sitio.capacidad })}</span>}
        </label>
        {mostrarNinos && (
          <label className="font-label-md text-label-md text-on-surface">
            {t("De ellas, niños")}
            <input
              type="number"
              min={0}
              max={Math.max(0, personas - 1)}
              value={valores.ninos ?? 0}
              onChange={(e) => onCambio({ ...valores, ninos: e.target.value })}
              className={CAMPO_RESERVA}
            />
            <span className="font-label-xs text-label-xs text-on-surface-variant">{t("Con tarifa de niño.")}</span>
          </label>
        )}
      </div>

      <label className="font-label-md text-label-md text-on-surface">
        {t("Nota para el prestador")} <span className="text-on-surface-variant font-normal">{t("(opcional)")}</span>
        <textarea
          rows={2}
          maxLength={500}
          placeholder={t("Ej. Viajamos con un niño, necesitamos guía en español…")}
          value={valores.nota}
          onChange={(e) => onCambio({ ...valores, nota: e.target.value })}
          className={`${CAMPO_RESERVA} resize-none`}
        />
      </label>

      <div className="flex flex-col gap-1 p-3 rounded-xl bg-surface-container-low">
        <div className="flex items-center justify-between">
          <span className="font-label-md text-label-md text-on-surface-variant">{t("Total estimado")}</span>
          <span className="font-title-sm text-title-sm text-primary font-bold">{total === 0 ? "Gratuito" : `${pesos(total)} COP`}</span>
        </div>
        {avanzada && cotizacion && (
          <p className="font-label-xs text-label-xs text-on-surface-variant">
            {cotizacion.temporada && <>{t("Tarifa «{nombre}».", { nombre: cotizacion.temporada })} </>}
            {(cotizacion.adultos === 1 ? t("1 adulto", { n: cotizacion.adultos }) : t("{n} adultos", { n: cotizacion.adultos }))} × {pesos(cotizacion.precio_adulto)}
            {cotizacion.ninos > 0 && <> + {(cotizacion.ninos === 1 ? t("1 niño", { n: cotizacion.ninos }) : t("{n} niños", { n: cotizacion.ninos }))} × {pesos(cotizacion.precio_nino)}</>}
            {cotizacion.descuento > 0 && <> · {t("descuento por grupo {pct} %", { pct: cotizacion.descuento_pct })} (−{pesos(cotizacion.descuento)})</>}
          </p>
        )}
      </div>
    </>
  );
}
