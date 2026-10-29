import { useEffect, useState } from "react";
import { useIdioma } from "../../context/idioma";

const DIAS = { es: ["L", "M", "M", "J", "V", "S", "D"], en: ["M", "T", "W", "T", "F", "S", "S"] };
const NOMBRES_MES = ["enero", "febrero", "marzo", "abril", "mayo", "junio", "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre"];

const ESTILOS = {
  libre: "bg-secondary-container/50 text-on-secondary-container hover:bg-secondary-container cursor-pointer",
  pocos: "bg-tertiary-fixed text-on-tertiary-fixed-variant hover:brightness-95 cursor-pointer",
  completo: "bg-surface-container-high text-outline line-through cursor-not-allowed",
  bloqueado: "bg-surface-container text-outline cursor-not-allowed",
  pasado: "text-outline-variant cursor-default",
};

const claveMes = (a, m) => `${a}-${String(m).padStart(2, "0")}`;

// Calendario mensual con la disponibilidad de cada día (libre, pocos cupos, completo o sin atención).
// `cargar(mes)` devuelve { dias:[{fecha, estado, cupos_libres, motivo}] } para un mes "AAAA-MM".
export default function CalendarioDisponibilidad({ cargar, seleccionada, onElegir }) {
  const { t, td, idioma, locale } = useIdioma();
  const hoy = new Date();
  const [anio, setAnio] = useState(seleccionada ? Number(seleccionada.slice(0, 4)) : hoy.getFullYear());
  const [mes, setMes] = useState(seleccionada ? Number(seleccionada.slice(5, 7)) : hoy.getMonth() + 1);
  const [datos, setDatos] = useState(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    let vigente = true;
    setDatos(null);
    setError(false);
    cargar(claveMes(anio, mes)).then((d) => vigente && setDatos(d)).catch(() => vigente && setError(true));
    return () => { vigente = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [anio, mes]);

  const esMesActual = anio === hoy.getFullYear() && mes === hoy.getMonth() + 1;
  const cambiarMes = (delta) => {
    const f = new Date(anio, mes - 1 + delta, 1);
    setAnio(f.getFullYear());
    setMes(f.getMonth() + 1);
  };

  const nombreMes = idioma === "es" ? NOMBRES_MES[mes - 1] : new Date(anio, mes - 1, 1).toLocaleDateString(locale, { month: "long" });
  const primerDia = (new Date(anio, mes - 1, 1).getDay() + 6) % 7; // lunes = 0
  const porFecha = new Map((datos?.dias || []).map((d) => [d.fecha, d]));

  return (
    <div className="p-3 rounded-2xl bg-surface-container-low flex flex-col gap-2" aria-label={t("Calendario de disponibilidad")}>
      <div className="flex items-center justify-between">
        <button type="button" aria-label={t("Mes anterior")} disabled={esMesActual} onClick={() => cambiarMes(-1)} className="w-8 h-8 rounded-full hover:bg-surface-container disabled:opacity-30 flex items-center justify-center">
          <span className="material-symbols-outlined text-[20px]">chevron_left</span>
        </button>
        <span className="font-title-sm text-title-sm text-on-surface font-semibold capitalize">{nombreMes} {anio}</span>
        <button type="button" aria-label={t("Mes siguiente")} onClick={() => cambiarMes(1)} className="w-8 h-8 rounded-full hover:bg-surface-container flex items-center justify-center">
          <span className="material-symbols-outlined text-[20px]">chevron_right</span>
        </button>
      </div>

      <div className="grid grid-cols-7 gap-1 text-center">
        {(DIAS[idioma] || DIAS.es).map((d, i) => <span key={i} className="font-label-xs text-label-xs text-outline font-semibold">{d}</span>)}
        {Array.from({ length: primerDia }, (_, i) => <span key={`v${i}`} />)}
        {Array.from({ length: new Date(anio, mes, 0).getDate() }, (_, i) => {
          const fecha = `${claveMes(anio, mes)}-${String(i + 1).padStart(2, "0")}`;
          const info = porFecha.get(fecha);
          const estado = info?.estado || (datos ? "pasado" : "pasado");
          const elegible = estado === "libre" || estado === "pocos";
          return (
            <button
              key={fecha}
              type="button"
              disabled={!elegible}
              data-estado={estado}
              title={estado === "bloqueado" && info?.motivo ? t("No atiende: {motivo}", { motivo: info.motivo }) : estado === "pocos" || estado === "libre" ? (info?.cupos_libres != null ? t("{n} cupos libres", { n: info.cupos_libres }) : t("Disponible")) : td(estado)}
              aria-label={`${t("{dia} de {mes}", { dia: i + 1, mes: nombreMes })}: ${td(estado)}${info?.cupos_libres != null && elegible ? `, ${t("{n} cupos", { n: info.cupos_libres })}` : ""}`}
              aria-pressed={seleccionada === fecha}
              onClick={() => elegible && onElegir(fecha)}
              className={`relative h-10 rounded-lg flex flex-col items-center justify-center font-label-md text-label-md transition-colors ${ESTILOS[estado]} ${seleccionada === fecha ? "ring-2 ring-primary" : ""}`}
            >
              {i + 1}
              {elegible && info?.cupos_libres != null && <span className="text-[9px] leading-none opacity-80">{info.cupos_libres}</span>}
            </button>
          );
        })}
      </div>

      {error && <p className="font-label-xs text-label-xs text-error">{t("No pudimos cargar la disponibilidad.")}</p>}
      <div className="flex flex-wrap gap-x-3 gap-y-1 font-label-xs text-label-xs text-on-surface-variant">
        <span className="inline-flex items-center gap-1"><i className="w-3 h-3 rounded bg-secondary-container/70 inline-block" />{t("Disponible")}</span>
        <span className="inline-flex items-center gap-1"><i className="w-3 h-3 rounded bg-tertiary-fixed inline-block" />{t("Pocos cupos")}</span>
        <span className="inline-flex items-center gap-1"><i className="w-3 h-3 rounded bg-surface-container-high inline-block" />{t("Completo")}</span>
        <span className="inline-flex items-center gap-1"><i className="w-3 h-3 rounded bg-surface-container inline-block border border-outline-variant" />{t("No atiende")}</span>
      </div>
    </div>
  );
}
