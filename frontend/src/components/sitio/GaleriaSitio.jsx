import { useState } from "react";
import { urlImagen } from "../../api/client";
import { CATEGORIA_ICONOS } from "../../constants";
import { useIdioma } from "../../context/idioma";

const FLECHA = "absolute top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-surface-container-lowest/90 hover:bg-surface-container-lowest text-primary shadow-md flex items-center justify-center transition-colors";

// Foto grande del servicio con carrusel y miniaturas; al pulsarla se abre a pantalla completa (el visor lo maneja la página).
export default function GaleriaSitio({ sitio, fotos, onAbrirVisor }) {
  const { t } = useIdioma();
  const [actual, setActual] = useState(0);
  const varias = fotos.length > 1;
  const ir = (destino) => setActual((destino + fotos.length) % fotos.length);

  if (fotos.length === 0) {
    return (
      <div className="aspect-[16/10] rounded-3xl bg-gradient-to-br from-primary-container to-secondary flex items-center justify-center">
        <span className="material-symbols-outlined text-on-primary text-[96px] opacity-60">{CATEGORIA_ICONOS[sitio.categoria] || "place"}</span>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="relative aspect-[16/10] rounded-3xl overflow-hidden bg-surface-container">
        <button onClick={() => onAbrirVisor(actual)} className="absolute inset-0 w-full h-full">
          <img src={urlImagen(fotos[actual])} alt={sitio.nombre} className="w-full h-full object-cover" loading="eager" />
        </button>
        {varias && (
          <>
            <button onClick={() => ir(actual - 1)} aria-label={t("Foto anterior")} className={`${FLECHA} left-3`}>
              <span className="material-symbols-outlined" aria-hidden="true">chevron_left</span>
            </button>
            <button onClick={() => ir(actual + 1)} aria-label={t("Foto siguiente")} className={`${FLECHA} right-3`}>
              <span className="material-symbols-outlined" aria-hidden="true">chevron_right</span>
            </button>
            <span className="absolute bottom-3 left-3 px-3 py-1 rounded-full bg-black/55 text-white font-label-xs text-label-xs">{t("{actual} de {total}", { actual: actual + 1, total: fotos.length })}</span>
            <button onClick={() => onAbrirVisor(actual)} className="absolute bottom-3 right-3 px-4 py-2 rounded-xl bg-surface-container-lowest/90 hover:bg-surface-container-lowest text-primary font-label-md text-label-md flex items-center gap-1.5 shadow-md transition-colors">
              <span className="material-symbols-outlined text-[18px]" aria-hidden="true">photo_library</span>
              {t("Ver {n} fotos", { n: fotos.length })}
            </button>
          </>
        )}
      </div>

      {varias && (
        <div className="flex gap-2 overflow-x-auto pb-1">
          {fotos.map((f, i) => (
            <button
              key={f}
              onClick={() => setActual(i)}
              aria-label={t("Foto {n}", { n: i + 1 })}
              aria-current={i === actual}
              className={`shrink-0 w-24 h-16 rounded-xl overflow-hidden border-2 transition-colors ${i === actual ? "border-secondary" : "border-transparent opacity-70 hover:opacity-100"}`}
            >
              <img src={urlImagen(f)} alt="" loading="lazy" decoding="async" className="w-full h-full object-cover" />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
