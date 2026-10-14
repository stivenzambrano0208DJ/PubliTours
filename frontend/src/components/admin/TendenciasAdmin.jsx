import { useState } from "react";
import { api } from "../../api/client";
import GraficaBarras from "../GraficaBarras";
import SelectorPeriodo from "../SelectorPeriodo";
import { useConsulta } from "../../hooks/useConsulta";
import { descargarArchivo } from "../../utils/descarga";
import { periodoInicial, etiquetaMes } from "../../utils/periodo";
import { pesos, pesosCortos } from "../../utils/moneda";

function Dato({ etiqueta, valor }) {
  return (
    <div className="bg-surface-container-low rounded-xl p-4 flex flex-col gap-0.5">
      <span className="font-label-xs text-label-xs uppercase tracking-wider text-outline font-semibold">{etiqueta}</span>
      <span className="font-headline-md text-headline-md text-on-surface font-bold">{valor}</span>
    </div>
  );
}

// Tendencias de la plataforma por mes (solo agregados, nunca datos de personas) con descarga en CSV.
export default function TendenciasAdmin() {
  const [periodo, setPeriodo] = useState(periodoInicial);
  const [descargando, setDescargando] = useState(false);
  const [errorCsv, setErrorCsv] = useState("");

  const completo = Boolean(periodo.desde && periodo.hasta);
  const { datos, error, cargando } = useConsulta(`${periodo.desde}|${periodo.hasta}`, () => api.tendenciasAdmin(periodo), completo);

  const descargarCsv = async () => {
    setDescargando(true);
    setErrorCsv("");
    try {
      descargarArchivo(await api.csvTendenciasAdmin(periodo), `tendencias-${periodo.desde}-a-${periodo.hasta}.csv`);
    } catch (err) {
      setErrorCsv(err.message);
    } finally {
      setDescargando(false);
    }
  };

  const t = datos?.totales;
  const serie = (campo) => datos.por_mes.map((m) => ({ etiqueta: etiquetaMes(m.mes), valor: m[campo] }));

  return (
    <section className="bg-surface-container-lowest rounded-2xl shadow-sm p-5 flex flex-col gap-5">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-3">
        <div>
          <h2 className="font-title-lg text-title-lg text-on-surface font-semibold">Tendencias</h2>
          <p className="font-body-sm text-body-sm text-on-surface-variant">Evolución mensual de registros y reservas. El valor y la comisión (estimada, no se cobra todavía) cuentan solo las reservas confirmadas o completadas.</p>
        </div>
        <div className="flex flex-wrap items-end gap-3">
          <SelectorPeriodo periodo={periodo} onCambio={setPeriodo} />
          <button type="button" onClick={descargarCsv} disabled={descargando || !completo || Boolean(error)} className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-primary text-on-primary font-label-md text-label-md hover:bg-primary-container transition-colors disabled:opacity-60">
            <span className="material-symbols-outlined text-[18px]">download</span>
            {descargando ? "Preparando..." : "Descargar CSV"}
          </button>
        </div>
      </div>
      {errorCsv && <p role="alert" className="font-body-sm text-body-sm text-error">{errorCsv}</p>}
      {error && <p role="alert" className="font-body-sm text-body-sm text-error">{error}</p>}
      {cargando && <p className="font-body-sm text-body-sm text-on-surface-variant">Calculando...</p>}

      {t && (
        <>
          <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-3">
            <Dato etiqueta="Turistas nuevos" valor={t.turistas_nuevos} />
            <Dato etiqueta="Prestadores nuevos" valor={t.prestadores_nuevos} />
            <Dato etiqueta="Solicitudes" valor={t.solicitudes} />
            <Dato etiqueta="Aceptadas" valor={t.aceptadas} />
            <Dato etiqueta="Valor aceptado" valor={pesos(t.valor_aceptado)} />
            <Dato etiqueta="Comisión estimada" valor={pesos(t.comision_estimada)} />
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <GraficaBarras titulo="Solicitudes de reserva por mes" datos={serie("solicitudes")} />
            <GraficaBarras titulo="Valor aceptado por mes" formato={pesosCortos} datos={serie("valor_aceptado")} />
            <GraficaBarras titulo="Comisión estimada por mes" formato={pesosCortos} datos={serie("comision_estimada")} />
            <GraficaBarras titulo="Turistas nuevos por mes" datos={serie("turistas_nuevos")} />
            <GraficaBarras titulo="Prestadores nuevos por mes" datos={serie("prestadores_nuevos")} />
          </div>
        </>
      )}
    </section>
  );
}
