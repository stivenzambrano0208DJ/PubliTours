import { useLayoutEffect, useRef, useState } from "react";

const ESCRITORIO = "(min-width: 1024px)"; // lg
const ARRIBA = 104; // px bajo el encabezado fijo
const MARGEN = 8; // para que la sombra de la tarjeta no se recorte
const SEPARACION = 40; // espacio entre el pie de página y la tarjeta
const ABAJO = 16; // aire entre la tarjeta y el borde inferior de la ventana

// ¿Pantalla de escritorio? Sin matchMedia (pruebas o navegadores viejos) se asume que no, y todo queda como en celular.
function useEscritorio() {
  const [escritorio, setEscritorio] = useState(() => !!window.matchMedia?.(ESCRITORIO).matches);
  useLayoutEffect(() => {
    const mq = window.matchMedia?.(ESCRITORIO);
    if (!mq) return;
    const cambiar = () => setEscritorio(mq.matches);
    mq.addEventListener?.("change", cambiar);
    return () => mq.removeEventListener?.("change", cambiar);
  }, []);
  return escritorio;
}

// Columna derecha de las páginas de detalle (precio y formulario de reserva). En escritorio la tarjeta queda fija en la pantalla:
// no se mueve al desplazar la página. Si su contenido es más alto que la ventana (por ejemplo, con el calendario abierto), se
// desplaza solo el contenido, por dentro de la tarjeta. El pie de página pasa por debajo y le deja libre su columna.
// En celular se muestra en su lugar, como cualquier bloque.
export default function TarjetaFija({ className = "", children }) {
  const escritorio = useEscritorio();
  const hueco = useRef(null);
  const [medida, setMedida] = useState(null);

  useLayoutEffect(() => {
    if (!escritorio || typeof ResizeObserver === "undefined") return;
    const medir = () => {
      const r = hueco.current.getBoundingClientRect();
      setMedida({ left: r.left, width: r.width });
      document.body.style.setProperty("--tarjeta-fija-ancho", `${r.width + SEPARACION}px`);
    };
    medir();
    document.body.dataset.tarjetaFija = "";
    const observador = new ResizeObserver(medir);
    observador.observe(hueco.current);
    window.addEventListener("resize", medir);
    return () => {
      observador.disconnect();
      window.removeEventListener("resize", medir);
      delete document.body.dataset.tarjetaFija;
      document.body.style.removeProperty("--tarjeta-fija-ancho");
    };
  }, [escritorio]);

  const fija = escritorio ? medida : null; // al pasar a celular se ignora la última medida

  return (
    <aside ref={hueco} className={className}>
      <div
        data-tarjeta-fija={fija ? "" : undefined}
        className={fija ? "fixed z-10 overflow-y-auto overscroll-contain [scrollbar-width:thin]" : undefined}
        style={fija ? { top: ARRIBA - MARGEN, left: fija.left - MARGEN, width: fija.width + 2 * MARGEN, padding: MARGEN, maxHeight: `calc(100vh - ${ARRIBA - MARGEN + ABAJO}px)` } : undefined}
      >
        {children}
      </div>
    </aside>
  );
}
