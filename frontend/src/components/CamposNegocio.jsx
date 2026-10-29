import { CATEGORIAS_NEGOCIO, MUNICIPIOS_CAQUETA } from "../constants";
import { CAMPO_AUTH } from "../estilos";
import { useIdioma } from "../context/idioma";


// Datos BÁSICOS del negocio, los únicos que se piden al registrarse. El resto (descripción, WhatsApp, dirección…)
// se completa después en el portal, antes de enviar el negocio a revisión.
export default function CamposNegocio({ valor, onChange, sinMarco = false }) {
  const { t, td } = useIdioma();
  const cambiar = (campo, v) => onChange({ ...valor, [campo]: v });

  return (
    <fieldset className={sinMarco ? "space-y-3.5" : "space-y-3.5 p-4 rounded-2xl bg-secondary-container/15 border border-secondary-container/60"}>
      <legend className="sr-only">{t("Datos de tu negocio")}</legend>
      {!sinMarco && <div className="flex items-start gap-2">
        <span className="material-symbols-outlined text-secondary text-[20px] mt-0.5">storefront</span>
        <div>
          <p className="font-title-sm text-title-sm text-on-surface font-semibold">{t("Datos de tu negocio")}</p>
          <p className="font-label-xs text-label-xs text-on-surface-variant">
            {t("Solo lo básico por ahora. Al entrar completarás el resto (descripción, WhatsApp, dirección) y recién entonces lo enviarás a revisión.")}
          </p>
        </div>
      </div>}

      <div>
        <label className="block font-label-md text-label-md text-on-surface mb-1.5" htmlFor="nombre_negocio">{t("Nombre del negocio")}</label>
        <input
          id="nombre_negocio"
          className={CAMPO_AUTH}
          placeholder={t("Ej. Finca Agroturística El Paraíso")}
          required
          maxLength={150}
          value={valor.nombre_negocio}
          onChange={(e) => cambiar("nombre_negocio", e.target.value)}
        />
      </div>

      <div>
        <p className="font-label-md text-label-md text-on-surface mb-1.5">{t("Categoría principal")}</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {CATEGORIAS_NEGOCIO.map((c) => (
            <label
              key={c.value}
              className={`flex items-center gap-2.5 p-2.5 rounded-xl border cursor-pointer transition-colors ${
                valor.categoria === c.value ? "border-secondary bg-secondary-container/30" : "border-surface-container-high bg-surface hover:bg-surface-container-low"
              }`}
            >
              <input type="radio" name="categoria_negocio" className="sr-only" required checked={valor.categoria === c.value} onChange={() => cambiar("categoria", c.value)} />
              <span className="material-symbols-outlined text-[18px] text-secondary shrink-0">{c.icono}</span>
              <span className="flex flex-col min-w-0 flex-1">
                <span className="font-label-md text-label-md text-on-surface font-semibold">{td(c.label)}</span>
                <span className="font-label-xs text-label-xs text-on-surface-variant">{td(c.detalle)}</span>
              </span>
              {valor.categoria === c.value && <span className="material-symbols-outlined text-secondary text-[18px] shrink-0" aria-hidden="true">check_circle</span>}
            </label>
          ))}
        </div>
      </div>

      <div>
        <label className="block font-label-md text-label-md text-on-surface mb-1.5" htmlFor="municipio_negocio">{t("Municipio de operación")}</label>
        <select id="municipio_negocio" required className={CAMPO_AUTH} value={valor.municipio} onChange={(e) => cambiar("municipio", e.target.value)}>
          <option value="" disabled>{t("Selecciona tu municipio...")}</option>
          {MUNICIPIOS_CAQUETA.map((m) => <option key={m} value={m}>{m}</option>)}
        </select>
      </div>
    </fieldset>
  );
}
