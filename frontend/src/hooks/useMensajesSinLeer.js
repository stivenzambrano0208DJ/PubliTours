import { useCallback, useEffect, useState } from "react";
import { api } from "../api/client";
import { usePolling } from "./usePolling";

// Quien lee o envía mensajes avisa con este evento para que el contador del encabezado se actualice al instante.
export const EVENTO_MENSAJES = "publitours:mensajes-actualizados";
export const avisarCambioMensajes = () => window.dispatchEvent(new Event(EVENTO_MENSAJES));

const CADA_MS = 30000;

// Cuántos mensajes tiene sin leer la persona. Se actualiza solo (cada 30 s con la pestaña a la vista) y cuando algo cambia.
export function useMensajesSinLeer(habilitado) {
  const [total, setTotal] = useState(0);

  const refrescar = useCallback(async () => {
    try {
      const { total: nuevo } = await api.mensajesSinLeer();
      setTotal(nuevo);
    } catch { /* sin conexión o sesión vencida: se conserva el último número */ }
  }, []);

  useEffect(() => {
    if (!habilitado) return undefined;
    const inicial = setTimeout(refrescar, 0); // primera consulta al montar (fuera del efecto, para no encadenar renders)
    window.addEventListener(EVENTO_MENSAJES, refrescar);
    return () => { clearTimeout(inicial); window.removeEventListener(EVENTO_MENSAJES, refrescar); };
  }, [habilitado, refrescar]);

  usePolling(refrescar, CADA_MS, habilitado);
  return habilitado ? total : 0;
}
