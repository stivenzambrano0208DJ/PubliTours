import { useEffect, useMemo, useRef, useState } from "react";
import { useConfiguracion } from "../../hooks/useConfiguracion";
import { admitirFotos, TIPOS_FOTO } from "../../utils/fotos";
import { prepararFoto } from "../../utils/imagenes";
import { useIdioma } from "../../context/idioma";
import Boton from "../ui/Boton";
import Aviso from "../ui/Aviso";

// Caja para escribir un mensaje, con fotos opcionales. Los topes (largo, cantidad y tamaño de fotos) los manda el servidor en /configuracion:
// mientras no han llegado no se ofrece adjuntar fotos en vez de inventar números. `onEnviar(texto, fotos)` debe lanzar un error si falla.
export default function RedactorMensaje({ onEnviar, placeholder: placeholderPropio, textoBoton: textoBotonPropio, autoFocus = false, deshabilitado = false }) {
  const { t, idioma } = useIdioma();
  const placeholder = placeholderPropio || t("Escribe tu mensaje…");
  const textoBoton = textoBotonPropio || t("Enviar");
  const config = useConfiguracion()?.mensajeria;
  const [texto, setTexto] = useState("");
  const [fotos, setFotos] = useState([]);
  const [error, setError] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [preparando, setPreparando] = useState(false);
  const selector = useRef(null);

  // Vistas previas de las fotos elegidas; se liberan al quitarlas o al cerrar.
  const previas = useMemo(() => fotos.map((f) => URL.createObjectURL(f)), [fotos]);
  useEffect(() => () => previas.forEach((u) => URL.revokeObjectURL(u)), [previas]);

  const elegirFotos = async (e) => {
    const elegidas = [...e.target.files];
    e.target.value = ""; // permite volver a elegir la misma foto
    // Una cámara de celular da fotos de varios MB: se reducen aquí (antes de revisar el tamaño y de subirlas, que con poca señal tarda minutos).
    // Lo que no es una foto admitida se deja tal cual para que admitirFotos lo rechace con su mensaje.
    setPreparando(true);
    try {
      const listas = await Promise.all(elegidas.map((f) => (TIPOS_FOTO.includes(f.type) ? prepararFoto(f) : f)));
      const { aceptadas, error: aviso } = admitirFotos(fotos, listas, { max: config.fotos_max, maxMb: config.foto_max_mb }, idioma);
      setFotos((actuales) => [...actuales, ...aceptadas]);
      setError(aviso);
    } finally {
      setPreparando(false);
    }
  };
  const quitarFoto = (indice) => { setFotos((actuales) => actuales.filter((_, i) => i !== indice)); setError(""); };

  const vacio = !texto.trim() && fotos.length === 0;
  const ocupado = enviando || preparando;
  const enviar = async (e) => {
    e?.preventDefault();
    if (vacio || ocupado || deshabilitado) return;
    setEnviando(true);
    setError("");
    try {
      await onEnviar(texto.trim(), fotos);
      setTexto("");
      setFotos([]);
    } catch (err) {
      setError(err.message);
    } finally {
      setEnviando(false);
    }
  };
  // En el celular Enter salta de línea; en el computador Ctrl + Enter envía.
  const alTeclear = (e) => { if ((e.ctrlKey || e.metaKey) && e.key === "Enter") enviar(e); };
  const cerca = config && texto.length > config.texto_max * 0.8;

  return (
    <form onSubmit={enviar} className="flex flex-col gap-2">
      {previas.length > 0 && (
        <ul className="flex flex-wrap gap-2" aria-label={t("Fotos para enviar")}>
          {previas.map((url, i) => (
            <li key={url} className="relative">
              <img src={url} alt={t("Foto {n} para enviar", { n: i + 1 })} className="h-16 w-16 rounded-xl object-cover bg-surface-container" />
              <button
                type="button" onClick={() => quitarFoto(i)} aria-label={t("Quitar foto {n}", { n: i + 1 })}
                className="absolute -top-1.5 -right-1.5 w-6 h-6 rounded-full bg-on-surface text-surface flex items-center justify-center shadow"
              >
                <span className="material-symbols-outlined text-[14px]" aria-hidden="true">close</span>
              </button>
            </li>
          ))}
        </ul>
      )}

      <div className="flex items-end gap-2">
        <input ref={selector} type="file" accept={TIPOS_FOTO.join(",")} multiple hidden onChange={elegirFotos} data-testid="selector-fotos" />
        <button
          type="button" onClick={() => selector.current?.click()} disabled={!config || deshabilitado || preparando || fotos.length >= (config?.fotos_max ?? 0)}
          aria-label={t("Adjuntar foto")} title={t("Adjuntar foto")}
          className="shrink-0 w-11 h-11 rounded-xl bg-surface-container text-on-surface-variant hover:bg-surface-container-high flex items-center justify-center transition-colors disabled:opacity-50"
        >
          <span className="material-symbols-outlined" aria-hidden="true">add_photo_alternate</span>
        </button>
        <div className="flex-1">
          <label htmlFor="texto-mensaje" className="sr-only">{t("Escribe tu mensaje")}</label>
          <textarea
            id="texto-mensaje" rows={2} value={texto} onChange={(e) => setTexto(e.target.value)} onKeyDown={alTeclear}
            maxLength={config?.texto_max} placeholder={placeholder} autoFocus={autoFocus} disabled={deshabilitado}
            className="w-full px-4 py-2.5 rounded-xl bg-surface-container-low border border-surface-container-high outline-none focus:border-secondary resize-none font-body-md text-body-md disabled:opacity-60"
          />
        </div>
        <Boton
          type="submit" disabled={vacio || ocupado || deshabilitado}
          className="shrink-0 h-11 px-4 font-semibold inline-flex items-center gap-1.5"
        >
          <span className="material-symbols-outlined text-[18px]" aria-hidden="true">{ocupado ? "hourglass_top" : "send"}</span>
          {enviando ? t("Enviando…") : preparando ? t("Preparando foto…") : textoBoton}
        </Boton>
      </div>

      <div className="flex items-start justify-between gap-3 min-h-[1.25rem]">
        {error ? <Aviso forma="pequeno">{error}</Aviso> : <span />}
        {cerca && <span className="font-label-xs text-label-xs text-on-surface-variant shrink-0">{texto.length}/{config.texto_max}</span>}
      </div>
    </form>
  );
}
