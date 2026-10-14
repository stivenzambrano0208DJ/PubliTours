import { useEffect, useRef } from "react";

// Repite una función cada cierto tiempo mientras la pestaña está a la vista. Si la pestaña estaba oculta, al volver consulta de inmediato.
// No consulta en segundo plano (ahorra batería y peticiones). `accion` puede cambiar sin reiniciar el temporizador.
export function usePolling(accion, intervaloMs, habilitado = true) {
  const ultima = useRef(accion);
  useEffect(() => { ultima.current = accion; });

  useEffect(() => {
    if (!habilitado) return undefined;
    const visible = () => document.visibilityState === "visible";
    const temporizador = setInterval(() => { if (visible()) ultima.current(); }, intervaloMs);
    const alVolver = () => { if (visible()) ultima.current(); };
    document.addEventListener("visibilitychange", alVolver);
    return () => { clearInterval(temporizador); document.removeEventListener("visibilitychange", alVolver); };
  }, [intervaloMs, habilitado]);
}
