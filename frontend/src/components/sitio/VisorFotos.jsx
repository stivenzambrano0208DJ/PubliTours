import { urlImagen } from "../../api/client";

const FLECHA = "absolute text-white p-2 rounded-full hover:bg-white/10";

// Visor de fotos a pantalla completa: se cierra al pulsar fuera, y con varias fotos avanza y retrocede dando la vuelta.
export default function VisorFotos({ fotos, indice, nombre, onCambiar, onCerrar }) {
  const varias = fotos.length > 1;
  const ir = (e, destino) => { e.stopPropagation(); onCambiar((destino + fotos.length) % fotos.length); };

  return (
    <div className="fixed inset-0 bg-black/90 z-[70] flex items-center justify-center p-4" onClick={onCerrar}>
      <button onClick={onCerrar} className={`${FLECHA} top-4 right-4`}>
        <span className="material-symbols-outlined text-[28px]">close</span>
      </button>
      {varias && (
        <button onClick={(e) => ir(e, indice - 1)} className={`${FLECHA} left-4`}>
          <span className="material-symbols-outlined text-[32px]">chevron_left</span>
        </button>
      )}
      <img
        src={urlImagen(fotos[indice])}
        alt={`${nombre} ${indice + 1}`}
        className="max-w-full max-h-[85vh] object-contain rounded-xl"
        onClick={(e) => e.stopPropagation()}
      />
      {varias && (
        <button onClick={(e) => ir(e, indice + 1)} className={`${FLECHA} right-4`}>
          <span className="material-symbols-outlined text-[32px]">chevron_right</span>
        </button>
      )}
      {varias && (
        <span className="absolute bottom-4 text-white font-label-md text-label-md bg-black/50 px-3 py-1 rounded-full">
          {indice + 1} / {fotos.length}
        </span>
      )}
    </div>
  );
}
