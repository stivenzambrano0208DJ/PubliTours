import { useLayoutEffect, useRef, useState } from "react";
import Modal from "./Modal";

const ESCRITORIO = "(min-width: 1024px)"; // lg
const ARRIBA = 104; // px bajo el encabezado fijo
const MARGEN = 8; // para que la sombra de la tarjeta no se recorte
const SEPARACION = 40; // espacio entre el pie de página y la tarjeta

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

// Columna derecha de las páginas de detalle (precio y reserva). En escritorio la tarjeta queda fija en la pantalla: no se mueve
// al desplazar la página, y el pie de página pasa por debajo dejándole su espacio a la derecha. Para que quepa siempre entera,
// el formulario largo se abre en una ventana (ver ReservaEnVentana). En celular se muestra en su lugar, como cualquier bloque.
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
        className={fija ? "fixed z-10" : undefined}
        style={fija ? { top: ARRIBA - MARGEN, left: fija.left - MARGEN, width: fija.width + 2 * MARGEN, padding: MARGEN } : undefined}
      >
        {children}
      </div>
    </aside>
  );
}

const BOTON = "w-full py-3.5 px-4 rounded-xl bg-primary text-on-primary hover:bg-primary-container transition-all font-label-md text-label-md font-bold shadow-lg flex items-center justify-center gap-2";

// El formulario de reserva: en escritorio, un botón en la tarjeta fija que lo abre en una ventana (así la tarjeta siempre cabe en la
// pantalla); en celular, el formulario directamente en la página. `alPulsar` reemplaza la apertura (por ejemplo, ir a iniciar sesión).
export function ReservaEnVentana({ titulo, subtitulo, boton, icono = "event_available", alPulsar, children }) {
  const escritorio = useEscritorio();
  const [abierta, setAbierta] = useState(false);
  if (!escritorio) return children;
  return (
    <>
      <button type="button" onClick={alPulsar || (() => setAbierta(true))} className={BOTON}>
        <span className="material-symbols-outlined text-[20px]" aria-hidden="true">{icono}</span>
        <span>{boton}</span>
      </button>
      {abierta && (
        <Modal etiqueta={titulo} onCerrar={() => setAbierta(false)} className="w-full max-w-md bg-surface-container-lowest rounded-2xl p-6 shadow-xl flex flex-col gap-4 max-h-[90vh] overflow-y-auto">
          <div>
            <h3 className="font-headline-md text-headline-md text-primary">{titulo}</h3>
            {subtitulo && <p className="font-body-sm text-body-sm text-on-surface-variant">{subtitulo}</p>}
          </div>
          {children}
        </Modal>
      )}
    </>
  );
}
