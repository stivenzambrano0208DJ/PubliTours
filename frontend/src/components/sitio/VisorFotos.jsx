import { urlImagen } from "../../api/client";
import { useIdioma } from "../../context/idioma";
import Modal from "../Modal";

const FLECHA = "absolute text-white p-2 rounded-full hover:bg-white/10";

// Visor de fotos a pantalla completa (servicios y paquetes): es un diálogo (rol, nombre, Escape y foco los da Modal), se cierra con la X,
// con Escape o tocando fuera de la foto, y con varias fotos avanza y retrocede dando la vuelta (también con las flechas del teclado).
export default function VisorFotos({ fotos, indice, nombre, onCambiar, onCerrar }) {
  const { t } = useIdioma();
  const varias = fotos.length > 1;
  const ir = (destino) => onCambiar((destino + fotos.length) % fotos.length);

  return (
    <Modal
      etiqueta={t("Fotos de {nombre}", { nombre })}
      onCerrar={onCerrar}
      fondo="bg-black/90 z-[70]"
      className="relative w-full flex items-center justify-center p-4"
      onClick={(e) => { if (e.target === e.currentTarget) onCerrar(); }}
      onKeyDown={(e) => {
        if (!varias) return;
        if (e.key === "ArrowRight") ir(indice + 1);
        else if (e.key === "ArrowLeft") ir(indice - 1);
      }}
    >
      <button onClick={onCerrar} aria-label={t("Cerrar visor")} className={`${FLECHA} top-4 right-4`}>
        <span className="material-symbols-outlined text-[28px]" aria-hidden="true">close</span>
      </button>
      {varias && (
        <button onClick={() => ir(indice - 1)} aria-label={t("Foto anterior")} className={`${FLECHA} left-4`}>
          <span className="material-symbols-outlined text-[32px]" aria-hidden="true">chevron_left</span>
        </button>
      )}
      <img
        src={urlImagen(fotos[indice])}
        alt={`${nombre} ${indice + 1}`}
        className="max-w-full max-h-[85vh] object-contain rounded-xl"
      />
      {varias && (
        <button onClick={() => ir(indice + 1)} aria-label={t("Foto siguiente")} className={`${FLECHA} right-4`}>
          <span className="material-symbols-outlined text-[32px]" aria-hidden="true">chevron_right</span>
        </button>
      )}
      {varias && (
        <span className="absolute bottom-4 text-white font-label-md text-label-md bg-black/50 px-3 py-1 rounded-full">
          {indice + 1} / {fotos.length}
        </span>
      )}
    </Modal>
  );
}
