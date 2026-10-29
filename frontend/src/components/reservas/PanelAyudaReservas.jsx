import { useNavigate } from "react-router-dom";
import { useIdioma } from "../../context/idioma";

const PASOS = [
  { icono: "hourglass_top", color: "text-secondary", titulo: "Pendiente", texto: "Tu solicitud fue enviada y espera revisión del prestador." },
  { icono: "verified_user", color: "text-secondary", titulo: "Solo prestadores verificados", texto: "Cada negocio fue revisado y aprobado por un administrador antes de publicar." },
  { icono: "lock", color: "text-on-tertiary-container", titulo: "Datos protegidos", texto: "Tu información se maneja conforme a la Ley 1581 de 2012." },
];

// Columna lateral: cómo funcionan las reservas y acceso al generador de itinerarios.
export default function PanelAyudaReservas() {
  const { t, td } = useIdioma();
  const navigate = useNavigate();
  return (
    <aside className="lg:col-span-4 flex flex-col gap-space-lg">
      <div className="bg-surface-container-lowest rounded-3xl p-space-lg shadow-[0_4px_24px_-2px_rgba(6,78,59,0.06)]">
        <div className="flex items-center gap-space-sm mb-space-md">
          <div className="w-10 h-10 rounded-2xl bg-primary-container text-on-primary flex items-center justify-center shrink-0 shadow-sm">
            <span className="material-symbols-outlined text-[22px]">verified</span>
          </div>
          <div>
            <h3 className="font-title-sm text-title-sm text-primary font-bold">{t("Cómo funcionan tus reservas")}</h3>
            <span className="font-label-xs text-label-xs text-secondary uppercase font-semibold">{t("Proceso real de PubliTours")}</span>
          </div>
        </div>
        <ul className="space-y-space-md">
          {PASOS.map((p) => (
            <li key={p.titulo} className="flex items-start gap-space-sm">
              <div className="w-7 h-7 rounded-lg bg-surface-container flex items-center justify-center shrink-0 mt-0.5">
                <span className={`material-symbols-outlined ${p.color} text-[16px]`}>{p.icono}</span>
              </div>
              <div>
                <h4 className="font-label-md text-label-md text-on-surface font-semibold">{td(p.titulo)}</h4>
                <p className="font-body-sm text-body-sm text-on-surface-variant">{td(p.texto)}</p>
              </div>
            </li>
          ))}
        </ul>
      </div>

      <div className="bg-gradient-to-br from-primary-container to-secondary rounded-3xl p-space-lg text-on-primary shadow-xl">
        <h3 className="font-headline-md text-headline-md font-bold mb-space-xs">{t("¿Quieres planear otra experiencia?")}</h3>
        <p className="font-body-sm text-body-sm text-on-primary/80 mb-space-md">
          {t("Genera un nuevo itinerario personalizado con el motor de scoring de PubliTours.")}
        </p>
        <button
          onClick={() => navigate("/itinerario")}
          className="w-full inline-flex items-center justify-center gap-space-xs py-3 px-space-lg bg-surface-container-lowest hover:bg-surface text-primary font-label-md text-label-md rounded-2xl transition-all shadow-md font-semibold"
        >
          <span className="material-symbols-outlined text-secondary text-[20px]">auto_awesome</span>
          <span>{t("Generar itinerario")}</span>
        </button>
      </div>
    </aside>
  );
}
