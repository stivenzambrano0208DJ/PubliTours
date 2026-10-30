import { urlFotoMensaje } from "../../api/client";
import { useIdioma } from "../../context/idioma";
import Modal from "../Modal";

// Foto de una conversación en grande. Es un diálogo (Modal): se cierra con Escape, con la X o tocando fuera de la foto.
export default function VisorFoto({ imagenId, onCerrar }) {
  const { t } = useIdioma();
  return (
    <Modal
      etiqueta={t("Foto")} onCerrar={onCerrar} fondo="bg-black/80 z-[70]"
      className="relative w-full flex items-center justify-center p-4"
      onClick={(e) => { if (e.target === e.currentTarget) onCerrar(); }}
    >
      <button type="button" onClick={onCerrar} aria-label={t("Cerrar foto")} className="absolute top-4 right-4 w-10 h-10 rounded-full bg-white/20 text-white hover:bg-white/30 flex items-center justify-center">
        <span className="material-symbols-outlined" aria-hidden="true">close</span>
      </button>
      <img src={urlFotoMensaje(imagenId)} alt={t("Foto de la conversación")} className="max-h-full max-w-full rounded-xl object-contain" />
    </Modal>
  );
}
