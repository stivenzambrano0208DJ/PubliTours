import { useConfiguracion } from "../../hooks/useConfiguracion";
import { useIdioma } from "../../context/idioma";

// Cómo se puede cancelar un servicio o paquete, para que el turista lo vea antes de reservar y en su comprobante.
export default function PoliticaCancelacion({ politica = "flexible" }) {
  const { t } = useIdioma();
  const plazo = useConfiguracion()?.politicas_cancelacion?.[politica];
  const nombre = { flexible: t("Cancelación flexible."), moderada: t("Cancelación moderada."), estricta: t("Cancelación estricta.") }[politica] || politica;
  return (
    <div className="p-3 rounded-xl bg-surface-container-low flex items-start gap-2 font-body-sm text-body-sm text-on-surface-variant">
      <span className="material-symbols-outlined text-secondary text-[18px] shrink-0 mt-0.5">event_busy</span>
      <p>
        <strong className="text-on-surface">{nombre}</strong>{" "}
        {plazo === 1 ? t("Gratis hasta 1 día antes del servicio; después se registra como cancelación tardía.")
          : plazo ? t("Gratis hasta {n} días antes del servicio; después se registra como cancelación tardía.", { n: plazo }) : ""}
      </p>
    </div>
  );
}
