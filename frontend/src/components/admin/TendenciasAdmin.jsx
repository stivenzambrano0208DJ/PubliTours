import { api } from "../../api/client";
import GraficaBarras from "../GraficaBarras";
import PanelPeriodo, { Dato } from "../PanelPeriodo";
import { etiquetaMes } from "../../utils/periodo";
import { pesos, pesosCortos } from "../../utils/moneda";

// Tendencias de la plataforma por mes (solo agregados, nunca datos de personas) con descarga en CSV.
export default function TendenciasAdmin() {
  return (
    <PanelPeriodo
      titulo="Tendencias"
      descripcion="Evolución mensual de registros y reservas. El valor y la comisión (estimada, no se cobra todavía) cuentan solo las reservas confirmadas o completadas."
      consultar={api.tendenciasAdmin}
      descargar={api.csvTendenciasAdmin}
      nombreCsv={(p) => `tendencias-${p.desde}-a-${p.hasta}.csv`}
    >
      {(datos) => {
        const t = datos.totales;
        const serie = (campo) => datos.por_mes.map((m) => ({ etiqueta: etiquetaMes(m.mes), valor: m[campo] }));
        return (
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
        );
      }}
    </PanelPeriodo>
  );
}
