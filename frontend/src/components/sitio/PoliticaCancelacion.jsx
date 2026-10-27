import { useConfiguracion } from "../../hooks/useConfiguracion";
import { NOMBRES_POLITICA, textoDias } from "../../utils/politicas";

// Cómo se puede cancelar un servicio o paquete, para que el turista lo vea antes de reservar y en su comprobante.
export default function PoliticaCancelacion({ politica = "flexible" }) {
  const plazo = useConfiguracion()?.politicas_cancelacion?.[politica];
  return (
    <div className="p-3 rounded-xl bg-surface-container-low flex items-start gap-2 font-body-sm text-body-sm text-on-surface-variant">
      <span className="material-symbols-outlined text-secondary text-[18px] shrink-0 mt-0.5">event_busy</span>
      <p>
        <strong className="text-on-surface">Cancelación {NOMBRES_POLITICA[politica]?.toLowerCase() || politica}.</strong>{" "}
        {plazo ? `Gratis hasta ${textoDias(plazo)} antes del servicio; después se registra como cancelación tardía.` : ""}
      </p>
    </div>
  );
}
