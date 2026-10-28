import { useLayoutEffect, useRef, useState } from "react";

const ESCRITORIO = "(min-width: 1024px)"; // lg
const ARRIBA = 128; // px bajo el encabezado fijo
const MARGEN = 8; // para que la sombra de la tarjeta no se recorte

// Columna derecha de las páginas de detalle (precio y reserva). En escritorio la tarjeta queda fija en la pantalla: no se mueve
// al desplazar la página; si es más alta que la ventana (por ejemplo, con el calendario abierto) se desplaza por dentro, y al
// llegar al final el pie de página pasa por encima. El hueco de la columna conserva su ancho y la altura de la tarjeta, para que
// la página siempre deje espacio para verla entera. En celular se muestra en su lugar, como cualquier bloque.
export default function TarjetaFija({ className = "", children }) {
  const hueco = useRef(null);
  const tarjeta = useRef(null);
  const [medida, setMedida] = useState(null);

  useLayoutEffect(() => {
    const mq = window.matchMedia?.(ESCRITORIO);
    if (!mq || typeof ResizeObserver === "undefined") return; // navegador sin soporte (o pruebas): queda como bloque normal
    const medir = () => {
      if (!mq.matches) return setMedida(null);
      const r = hueco.current.getBoundingClientRect();
      setMedida({ left: r.left, width: r.width, alto: tarjeta.current.scrollHeight });
    };
    medir();
    const observador = new ResizeObserver(medir);
    observador.observe(hueco.current);
    observador.observe(tarjeta.current);
    window.addEventListener("resize", medir);
    mq.addEventListener?.("change", medir);
    return () => {
      observador.disconnect();
      window.removeEventListener("resize", medir);
      mq.removeEventListener?.("change", medir);
    };
  }, []);

  return (
    <aside ref={hueco} className={className} style={medida ? { minHeight: Math.min(medida.alto, window.innerHeight) } : undefined}>
      <div
        ref={tarjeta}
        data-tarjeta-fija={medida ? "" : undefined}
        className={medida ? "fixed z-10 overflow-y-auto overscroll-contain" : undefined}
        style={medida ? { top: ARRIBA - MARGEN, left: medida.left - MARGEN, width: medida.width + 2 * MARGEN, padding: MARGEN, maxHeight: `calc(100vh - ${ARRIBA}px)` } : undefined}
      >
        {children}
      </div>
    </aside>
  );
}
