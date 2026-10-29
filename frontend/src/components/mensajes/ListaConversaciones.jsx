import { Link } from "react-router-dom";
import { tiempoRelativo } from "../../utils/tiempo";
import { useIdioma } from "../../context/idioma";

// Lo último de la conversación en una línea: "Tú: …", t("Foto"), o que el mensaje fue retirado.
function vistaPrevia(ultimo, t) {
  if (!ultimo) return t("Sin mensajes");
  if (ultimo.retirado) return t("Mensaje retirado");
  const base = ultimo.texto || (ultimo.con_fotos ? t("Foto") : "");
  return ultimo.mio ? t("Tú: {texto}", { texto: base }) : base;
}

// Mis conversaciones, la más reciente primero. La abierta se resalta y las que tienen mensajes sin leer llevan un contador.
export default function ListaConversaciones({ conversaciones, activaId }) {
  const { t, idioma } = useIdioma();
  if (conversaciones.length === 0) {
    return (
      <div className="p-space-lg text-center flex flex-col items-center gap-2 text-on-surface-variant">
        <span className="material-symbols-outlined text-[40px] text-outline" aria-hidden="true">forum</span>
        <p className="font-title-sm text-title-sm text-on-surface">{t("Aún no tienes mensajes")}</p>
        <p className="font-body-sm text-body-sm">{t("Pregunta lo que quieras desde la página de un servicio o un paquete, y aquí verás las respuestas. Si tienes un negocio, aquí llegarán las preguntas de tus clientes.")}</p>
      </div>
    );
  }
  return (
    <ul aria-label={t("Mis conversaciones")} className="flex flex-col">
      {conversaciones.map((c) => (
        <li key={c.id}>
          <Link
            to={`/mensajes/${c.id}`} aria-current={String(c.id) === String(activaId) ? "page" : undefined}
            className={`flex items-center gap-3 px-4 py-3 border-b border-surface-container transition-colors hover:bg-surface-container-low ${String(c.id) === String(activaId) ? "bg-surface-container-low" : ""}`}
          >
            <div className="w-11 h-11 rounded-full bg-primary-container text-on-primary flex items-center justify-center font-bold shrink-0" aria-hidden="true">
              {c.contraparte.nombre.charAt(0).toUpperCase()}
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-baseline justify-between gap-2">
                <span className={`truncate font-title-sm text-title-sm ${c.sin_leer > 0 ? "text-on-surface font-bold" : "text-on-surface font-semibold"}`}>{c.contraparte.nombre}</span>
                <span className="shrink-0 font-label-xs text-label-xs text-on-surface-variant">{tiempoRelativo(c.ultimo_mensaje_en, undefined, idioma)}</span>
              </div>
              <div className="flex items-center justify-between gap-2">
                <span className={`truncate font-body-sm text-body-sm ${c.sin_leer > 0 ? "text-on-surface" : "text-on-surface-variant"}`}>{vistaPrevia(c.ultimo, t)}</span>
                {c.sin_leer > 0 && (
                  <span className="shrink-0 min-w-5 h-5 px-1.5 rounded-full bg-secondary text-on-secondary font-label-xs text-label-xs font-bold flex items-center justify-center" aria-label={t("{n} sin leer", { n: c.sin_leer })}>
                    {c.sin_leer}
                  </span>
                )}
              </div>
              <span className="font-label-xs text-label-xs text-outline">{c.lado === "negocio" ? t("Cliente") : t("Negocio")}</span>
            </div>
          </Link>
        </li>
      ))}
    </ul>
  );
}
