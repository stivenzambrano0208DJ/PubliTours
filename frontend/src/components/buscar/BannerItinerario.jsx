import { useNavigate } from "react-router-dom";
import { useIdioma } from "../../context/idioma";

// Invitación al generador de itinerarios al final de los resultados.
export default function BannerItinerario() {
  const { t } = useIdioma();
  const navigate = useNavigate();
  return (
    <div className="mt-space-lg p-space-md rounded-2xl bg-gradient-to-r from-primary-container via-secondary to-primary-container text-on-primary shadow-lg flex flex-col md:flex-row items-center justify-between gap-space-md">
      <div className="flex items-center gap-space-md">
        <div className="w-12 h-12 rounded-xl bg-surface-container-lowest/15 backdrop-blur-md flex items-center justify-center shrink-0">
          <span className="material-symbols-outlined text-[28px] text-tertiary-fixed">neurology</span>
        </div>
        <div>
          <h4 className="font-title-lg text-title-lg font-bold">{t("¿No decides cuál visitar primero?")}</h4>
          <p className="font-body-sm text-body-sm text-on-primary-container max-w-xl">
            {t("Indica tus días disponibles y tu presupuesto: el sistema arma tu itinerario combinando las mejores opciones del catálogo verificado.")}
          </p>
        </div>
      </div>
      <button
        onClick={() => navigate("/itinerario")}
        className="px-space-md py-3 rounded-xl bg-surface-container-lowest text-primary hover:bg-surface font-title-sm text-title-sm shadow-md text-nowrap transition-all flex items-center gap-2"
      >
        <span className="material-symbols-outlined text-[18px] text-secondary">auto_awesome</span>
        <span>{t("Generar Itinerario")}</span>
      </button>
    </div>
  );
}
