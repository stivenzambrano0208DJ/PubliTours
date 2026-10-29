import { Link } from "react-router-dom";
import { useMensajesSinLeer } from "../../hooks/useMensajesSinLeer";
import { useIdioma } from "../../context/idioma";

// Acceso a los mensajes desde el encabezado, con el número de mensajes sin leer (se actualiza solo).
export default function IndicadorMensajes() {
  const { t } = useIdioma();
  const total = useMensajesSinLeer(true);
  return (
    <Link
      to="/mensajes" aria-label={total > 0 ? t("Mensajes: {n} sin leer", { n: total }) : t("Mensajes")}
      className="relative w-10 h-10 rounded-full flex items-center justify-center text-on-surface-variant hover:bg-surface-container hover:text-on-surface transition-colors"
    >
      <span className="material-symbols-outlined text-[24px]" aria-hidden="true">chat</span>
      {total > 0 && (
        <span className="absolute top-0.5 right-0.5 min-w-[1.1rem] h-[1.1rem] px-1 rounded-full bg-secondary text-on-secondary font-label-xs text-[10px] font-bold flex items-center justify-center" aria-hidden="true">
          {total > 99 ? "99+" : total}
        </span>
      )}
    </Link>
  );
}
