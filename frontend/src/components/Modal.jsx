import { useEffect, useRef } from "react";

// Ventana emergente base: reúne lo que toda ventana accesible necesita (rol y nombre, Escape, foco, scroll del fondo) para que cada
// pantalla solo aporte su contenido. Se renderiza solo cuando está abierta: quien la usa decide cuándo montarla.
//  - etiqueta / tituloId: nombre accesible del diálogo (texto directo, o id del título que ya muestra la ventana).
//  - onCerrar: se llama con Escape y al pulsar el fondo. Con cerrarConEscape / cerrarAlPulsarFondo en false, cada uno se desactiva.
//  - as: etiqueta del panel ("form" cuando toda la ventana es un formulario); el resto de props (onSubmit, className…) pasan al panel.
//  - fondo: clases de la capa que cubre la pantalla (color, altura/posición y z-index propios de cada ventana).

const FOCALIZABLES = 'a[href], button:not([disabled]), input:not([disabled]):not([type="hidden"]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

// Ventanas abiertas, de la más antigua a la más reciente: Escape solo cierra la de arriba (por ejemplo, una confirmación sobre un formulario).
const abiertas = [];
let bloqueos = 0;
let desbordeAnterior = "";

function bloquearScroll() {
  if (bloqueos++ === 0) {
    desbordeAnterior = document.body.style.overflow;
    document.body.style.overflow = "hidden";
  }
  return () => {
    if (--bloqueos === 0) document.body.style.overflow = desbordeAnterior;
  };
}

export default function Modal({ etiqueta, tituloId, onCerrar, cerrarConEscape = true, cerrarAlPulsarFondo = true, as: Panel = "div", fondo = "bg-black/40 z-[60] items-center p-4", children, ...panelProps }) {
  const panel = useRef(null);
  const cerrar = useRef(onCerrar);
  const conEscape = useRef(cerrarConEscape);
  useEffect(() => {
    cerrar.current = onCerrar;
    conEscape.current = cerrarConEscape;
  });

  useEffect(() => {
    const previo = document.activeElement;
    const quitarScroll = bloquearScroll();
    const yo = {};
    abiertas.push(yo);

    // Foco inicial: respeta el campo que la ventana ya enfocó (autoFocus); si no, el primer control; si no hay, el propio panel.
    if (!panel.current.contains(document.activeElement)) (panel.current.querySelector(FOCALIZABLES) || panel.current).focus();

    const alTeclear = (e) => {
      if (abiertas[abiertas.length - 1] !== yo) return;
      if (e.key === "Escape" && conEscape.current) {
        e.stopPropagation();
        cerrar.current?.();
      } else if (e.key === "Tab") {
        const controles = [...panel.current.querySelectorAll(FOCALIZABLES)].filter((c) => !c.closest("[hidden]"));
        if (controles.length === 0) return e.preventDefault();
        const primero = controles[0], ultimo = controles[controles.length - 1];
        if (!panel.current.contains(document.activeElement)) {
          e.preventDefault();
          primero.focus();
        } else if (e.shiftKey && (document.activeElement === primero || document.activeElement === panel.current)) {
          e.preventDefault();
          ultimo.focus();
        } else if (!e.shiftKey && document.activeElement === ultimo) {
          e.preventDefault();
          primero.focus();
        }
      }
    };
    document.addEventListener("keydown", alTeclear);

    return () => {
      document.removeEventListener("keydown", alTeclear);
      abiertas.splice(abiertas.indexOf(yo), 1);
      quitarScroll();
      if (previo?.isConnected && typeof previo.focus === "function") previo.focus();
    };
  }, []);

  return (
    <div className={`fixed inset-0 flex justify-center ${fondo}`} onClick={(e) => { if (cerrarAlPulsarFondo && e.target === e.currentTarget) onCerrar?.(); }}>
      <Panel ref={panel} role="dialog" aria-modal="true" aria-label={etiqueta} aria-labelledby={tituloId} tabIndex={-1} {...panelProps}>
        {children}
      </Panel>
    </div>
  );
}
