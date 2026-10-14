import { useEffect, useState } from "react";

// Pide datos al servidor cada vez que cambia `clave` (p. ej. el periodo elegido) y expone { datos, error, cargando }.
// "Cargando" se deduce de qué clave llegó, sin encender y apagar estado dentro del efecto, y se descartan las
// respuestas de consultas que ya quedaron viejas. Con `habilitada = false` no consulta.
export function useConsulta(clave, consulta, habilitada = true) {
  const [resultado, setResultado] = useState({ clave: null, datos: null, error: "" });

  useEffect(() => {
    if (!habilitada) return undefined;
    let vigente = true;
    Promise.resolve()
      .then(consulta)
      .then((datos) => vigente && setResultado({ clave, datos, error: "" }))
      .catch((err) => vigente && setResultado({ clave, datos: null, error: err.message }));
    return () => { vigente = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clave, habilitada]);

  const actual = resultado.clave === clave;
  return { datos: actual ? resultado.datos : null, error: actual ? resultado.error : "", cargando: habilitada && !actual };
}
