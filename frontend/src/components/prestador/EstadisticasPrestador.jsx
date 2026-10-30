import { api } from "../../api/client";
import GraficaBarras from "../GraficaBarras";
import PanelPeriodo, { Dato } from "../PanelPeriodo";
import { etiquetaMes } from "../../utils/periodo";
import { pesos, pesosCortos } from "../../utils/moneda";

// Estadísticas del negocio por periodo, calculadas por el servidor con las reservas reales; se pueden descargar en CSV.
export default function EstadisticasPrestador() {
  return (
    <PanelPeriodo
      id="estadisticas"
      className="w-full scroll-mt-24"
      titulo="Estadísticas"
      descripcion="Según la fecha del servicio de tus reservas. Los ingresos cuentan solo las confirmadas y completadas; la comisión es una estimación del modelo de la plataforma y hoy no se cobra."
      consultar={api.estadisticasPrestador}
      descargar={api.csvEstadisticasPrestador}
      nombreCsv={(p) => `reservas-${p.desde}-a-${p.hasta}.csv`}
    >
      {(datos) => {
        const t = datos.totales;
        return (
          <>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
              <Dato etiqueta="Solicitudes" valor={t.solicitudes} nota={t.por_estado.cancelada ? `${t.por_estado.cancelada} cancelada(s), ${t.cancelaciones_tardias} tardía(s)` : undefined} />
              <Dato etiqueta="Aceptadas" valor={t.confirmadas} nota={`${t.por_estado.pendiente} pendiente(s)`} />
              <Dato etiqueta="Ingresos" valor={pesos(t.ingresos)} nota={`${t.personas} persona(s) atendidas`} />
              <Dato etiqueta="Comisión estimada" valor={pesos(t.comision)} nota={`${String(t.comision_pct).replace(".", ",")} % · aún no se cobra`} />
              <Dato etiqueta="Neto estimado" valor={pesos(t.neto)} nota="ingresos menos comisión" />
              <Dato etiqueta="Ticket promedio" valor={t.ticket_promedio === null ? "—" : pesos(t.ticket_promedio)} />
              <Dato etiqueta="No asistencia" valor={t.tasa_no_asistencia === null ? "—" : `${t.tasa_no_asistencia} %`} nota={`${t.por_estado.no_asistio} de las ya cerradas`} />
              <Dato etiqueta="Tasa de aceptación" valor={t.tasa_aceptacion === null ? "—" : `${t.tasa_aceptacion} %`} nota="de las que respondiste" />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <GraficaBarras titulo="Solicitudes por mes" datos={datos.por_mes.map((m) => ({ etiqueta: etiquetaMes(m.mes), valor: m.solicitudes }))} />
              <GraficaBarras titulo="Ingresos por mes" formato={pesosCortos} datos={datos.por_mes.map((m) => ({ etiqueta: etiquetaMes(m.mes), valor: m.ingresos }))} />
            </div>

            <div className="overflow-x-auto">
              <h3 className="font-title-sm text-title-sm text-on-surface font-semibold mb-2">Qué se vende más</h3>
              {datos.por_servicio.length === 0 ? (
                <p className="font-body-sm text-body-sm text-on-surface-variant">Aún no hay reservas aceptadas en este periodo.</p>
              ) : (
                <table className="w-full text-left font-body-sm text-body-sm">
                  <thead>
                    <tr className="text-outline font-label-xs text-label-xs uppercase">
                      <th className="py-2 pr-4 font-semibold">Servicio</th>
                      <th className="py-2 pr-4 font-semibold">Reservas</th>
                      <th className="py-2 pr-4 font-semibold">Personas</th>
                      <th className="py-2 font-semibold text-right">Ingresos</th>
                    </tr>
                  </thead>
                  <tbody>
                    {datos.por_servicio.map((s) => (
                      <tr key={`${s.tipo}-${s.nombre}`} className="border-t border-surface-container-high">
                        <td className="py-2 pr-4 text-on-surface">{s.nombre}{s.tipo === "paquete" && <span className="ml-2 font-label-xs text-label-xs text-secondary font-bold uppercase">Paquete</span>}</td>
                        <td className="py-2 pr-4">{s.reservas}</td>
                        <td className="py-2 pr-4">{s.personas}</td>
                        <td className="py-2 text-right font-semibold text-primary">{pesos(s.ingresos)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </>
        );
      }}
    </PanelPeriodo>
  );
}
