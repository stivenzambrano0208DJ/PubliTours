import { useConfiguracion } from "../hooks/useConfiguracion";

// "10 %" tomado del servidor; si no se pudo consultar, un texto neutro (nunca un número inventado).
export default function Comision() {
  const pct = useConfiguracion()?.comision_pct ?? null;
  return pct === null ? "un porcentaje" : `${String(pct).replace(".", ",")} %`;
}
