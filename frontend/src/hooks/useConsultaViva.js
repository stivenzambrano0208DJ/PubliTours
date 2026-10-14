import { useCallback, useEffect, useRef, useState } from "react";
import { useConsulta } from "./useConsulta";
import { usePolling } from "./usePolling";

// Como useConsulta, pero además se actualiza sola cada `ms` mientras la pestaña está a la vista, y se puede refrescar a mano con `recargar`.
// Si una actualización falla (sin conexión) se conserva lo último que llegó.
export function useConsultaViva(clave, consulta, ms, habilitada = true) {
  const base = useConsulta(clave, consulta, habilitada);
  const [reciente, setReciente] = useState({ clave: null, datos: null });
  const ultima = useRef(consulta);
  useEffect(() => { ultima.current = consulta; });

  const recargar = useCallback(async () => {
    try {
      setReciente({ clave, datos: await ultima.current() });
    } catch { /* se conserva lo anterior */ }
  }, [clave]);

  usePolling(recargar, ms, habilitada);
  const datos = reciente.clave === clave && reciente.datos ? reciente.datos : base.datos;
  return { ...base, datos, recargar };
}
