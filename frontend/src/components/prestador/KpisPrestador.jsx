import { useMemo } from "react";

function Kpi({ etiqueta, icono, colorIcono, valor }) {
  return (
    <div className="bg-surface-container-lowest rounded-2xl p-5 shadow-sm">
      <div className="flex items-center justify-between">
        <span className="font-label-xs text-label-xs uppercase tracking-wider text-outline font-semibold">{etiqueta}</span>
        <span className={`material-symbols-outlined text-[18px] ${colorIcono}`}>{icono}</span>
      </div>
      <span className="font-headline-xl text-headline-xl text-on-surface font-bold block mt-2">{valor}</span>
    </div>
  );
}

export default function KpisPrestador({ reservas, sitios }) {
  const kpis = useMemo(() => {
    const ahora = new Date();
    const reservasMes = reservas.filter((r) => {
      const f = new Date(r.fecha_solicitud);
      return f.getMonth() === ahora.getMonth() && f.getFullYear() === ahora.getFullYear();
    }).length;
    const ingresosConfirmados = reservas
      .filter((r) => r.estado === "confirmada" || r.estado === "completada")
      .reduce((sum, r) => sum + Number(r.total || 0), 0);
    const serviciosActivos = sitios.filter((s) => s.estado === "activo").length;
    const reservasPendientes = reservas.filter((r) => r.estado === "pendiente").length;
    return { reservasMes, ingresosConfirmados, serviciosActivos, reservasPendientes };
  }, [reservas, sitios]);

  return (
    <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      <Kpi etiqueta="Reservas del mes" icono="calendar_month" colorIcono="text-primary" valor={kpis.reservasMes} />
      <Kpi etiqueta="Reservas pendientes" icono="hourglass_top" colorIcono="text-on-tertiary-container" valor={kpis.reservasPendientes} />
      <Kpi etiqueta="Servicios activos" icono="cabin" colorIcono="text-secondary" valor={kpis.serviciosActivos} />
      <div className="bg-primary-container text-on-primary-container rounded-2xl p-5 shadow-sm">
        <div className="flex items-center justify-between">
          <span className="font-label-xs text-label-xs uppercase tracking-wider text-primary-fixed-dim font-bold">Ingresos confirmados</span>
          <span className="material-symbols-outlined text-[18px] text-primary-fixed">payments</span>
        </div>
        <span className="font-headline-md text-headline-md text-on-primary font-bold block mt-2">${kpis.ingresosConfirmados.toLocaleString("es-CO")}</span>
        <span className="font-label-xs text-label-xs text-primary-fixed-dim">COP · reservas confirmadas</span>
      </div>
    </section>
  );
}
