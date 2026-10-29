import { Children, useCallback, useEffect, useRef, useState } from "react";
import { useIdioma } from "../context/idioma";

// Carrusel horizontal con scroll-snap: avanza solo, tiene flechas y puntos, y se detiene al pasar el mouse
// o enfocarlo. Muestra 1 elemento en celular, 2 en tablet y 3 en escritorio. Respeta "reducir movimiento".
export default function Carrusel({ children, intervaloMs = 5000, etiqueta = "Carrusel" }) {
  const { t } = useIdioma();
  const pista = useRef(null);
  const [indice, setIndice] = useState(0);
  const [visibles, setVisibles] = useState(1);
  const [pausado, setPausado] = useState(false);
  const items = Children.toArray(children);
  const maximo = Math.max(0, items.length - visibles);

  // Distancia entre el inicio de una tarjeta y la siguiente (incluye el espacio entre tarjetas).
  const paso = useCallback(() => {
    const hijos = pista.current?.children;
    if (!hijos || hijos.length < 2) return 0;
    return hijos[1].offsetLeft - hijos[0].offsetLeft;
  }, []);

  const medir = useCallback(() => {
    const p = paso();
    if (p > 0) setVisibles(Math.max(1, Math.round(pista.current.clientWidth / p)));
  }, [paso]);

  useEffect(() => {
    medir();
    window.addEventListener("resize", medir);
    return () => window.removeEventListener("resize", medir);
  }, [medir, items.length]);

  const irA = useCallback((n) => {
    const destino = Math.min(Math.max(0, n), maximo);
    setIndice(destino);
    pista.current?.scrollTo({ left: destino * paso(), behavior: "smooth" });
  }, [maximo, paso]);

  // Si el usuario desliza con el dedo o el trackpad, los puntos siguen su posición.
  const alDeslizar = () => {
    const p = paso();
    if (p > 0) setIndice(Math.min(maximo, Math.round(pista.current.scrollLeft / p)));
  };

  useEffect(() => {
    const sinMovimiento = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    if (pausado || sinMovimiento || maximo === 0) return;
    const t = setInterval(() => irA(indice >= maximo ? 0 : indice + 1), intervaloMs);
    return () => clearInterval(t);
  }, [pausado, maximo, indice, irA, intervaloMs]);

  if (items.length === 0) return null;
  const hayMas = maximo > 0;

  return (
    <div
      className="relative"
      role="region"
      aria-roledescription="carrusel"
      aria-label={etiqueta}
      onMouseEnter={() => setPausado(true)}
      onMouseLeave={() => setPausado(false)}
      onFocus={() => setPausado(true)}
      onBlur={() => setPausado(false)}
    >
      <div
        ref={pista}
        onScroll={alDeslizar}
        className="flex gap-6 overflow-x-auto snap-x snap-mandatory scroll-smooth py-4 -my-4 px-1 -mx-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      >
        {items.map((item, i) => (
          <div key={item.key ?? i} role="group" aria-roledescription="diapositiva" aria-label={`${i + 1} de ${items.length}`} className="snap-start shrink-0 w-full md:w-[calc(50%-12px)] lg:w-[calc(33.333%-16px)]">
            {item}
          </div>
        ))}
      </div>

      {hayMas && (
        <>
          <button
            type="button"
            aria-label={t("Anterior")}
            onClick={() => irA(indice <= 0 ? maximo : indice - 1)}
            className="hidden md:flex absolute -left-4 top-1/2 -translate-y-1/2 w-11 h-11 rounded-full bg-surface-container-lowest shadow-lg text-primary items-center justify-center hover:bg-primary-container hover:text-on-primary transition-colors"
          >
            <span className="material-symbols-outlined">chevron_left</span>
          </button>
          <button
            type="button"
            aria-label={t("Siguiente")}
            onClick={() => irA(indice >= maximo ? 0 : indice + 1)}
            className="hidden md:flex absolute -right-4 top-1/2 -translate-y-1/2 w-11 h-11 rounded-full bg-surface-container-lowest shadow-lg text-primary items-center justify-center hover:bg-primary-container hover:text-on-primary transition-colors"
          >
            <span className="material-symbols-outlined">chevron_right</span>
          </button>

          <div className="flex items-center justify-center gap-2 mt-6">
            {Array.from({ length: maximo + 1 }, (_, i) => (
              <button
                key={i}
                type="button"
                aria-label={`Ir a la diapositiva ${i + 1}`}
                aria-current={i === indice}
                onClick={() => irA(i)}
                className={`h-2 rounded-full transition-all ${i === indice ? "w-6 bg-secondary" : "w-2 bg-outline-variant hover:bg-outline"}`}
              />
            ))}
          </div>
        </>
      )}
    </div>
  );
}
