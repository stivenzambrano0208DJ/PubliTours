import { useConfiguracion } from "../../hooks/useConfiguracion";
import { CLAVES_POLITICA, NOMBRES_POLITICA, textoDias } from "../../utils/politicas";
import { CAMPO } from "../../estilos";


// El prestador elige qué tan estricta es la cancelación de su servicio o paquete.
export default function SelectorPolitica({ value, onChange }) {
  const plazos = useConfiguracion()?.politicas_cancelacion;
  return (
    <label className="flex flex-col gap-1.5">
      <span className="font-label-md text-label-md text-on-surface font-semibold">Política de cancelación</span>
      <select className={CAMPO} value={value} onChange={(e) => onChange(e.target.value)}>
        {CLAVES_POLITICA.map((clave) => (
          <option key={clave} value={clave}>
            {NOMBRES_POLITICA[clave]}{plazos?.[clave] ? ` — gratis hasta ${textoDias(plazos[clave])} antes` : ""}
          </option>
        ))}
      </select>
      <span className="font-label-xs text-label-xs text-on-surface-variant">
        El turista siempre puede cancelar hasta el día anterior. Si lo hace con menos antelación que tu política, la cancelación se marca como tardía y tú lo ves.
      </span>
    </label>
  );
}
