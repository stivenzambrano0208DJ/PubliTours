import { useEffect } from "react";
import { urlFotoMensaje } from "../../api/client";
import { useIdioma } from "../../context/idioma";

// Foto de una conversación en grande. Se cierra con Escape, con la X o tocando fuera de la foto.
export default function VisorFoto({ imagenId, onCerrar }) {
  const { t } = useIdioma();
  useEffect(() => {
    const alTeclear = (e) => { if (e.key === "Escape") onCerrar(); };
    document.addEventListener("keydown", alTeclear);
    return () => document.removeEventListener("keydown", alTeclear);
  }, [onCerrar]);

  return (
    <div role="dialog" aria-modal="true" aria-label={t("Foto")} className="fixed inset-0 z-[70] bg-black/80 flex items-center justify-center p-4" onClick={onCerrar}>
      <button type="button" onClick={onCerrar} aria-label={t("Cerrar foto")} className="absolute top-4 right-4 w-10 h-10 rounded-full bg-white/20 text-white hover:bg-white/30 flex items-center justify-center">
        <span className="material-symbols-outlined" aria-hidden="true">close</span>
      </button>
      <img src={urlFotoMensaje(imagenId)} alt={t("Foto de la conversación")} onClick={(e) => e.stopPropagation()} className="max-h-full max-w-full rounded-xl object-contain" />
    </div>
  );
}
