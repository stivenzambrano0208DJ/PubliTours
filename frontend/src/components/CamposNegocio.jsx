import { CATEGORIAS_NEGOCIO, MUNICIPIOS_CAQUETA } from "../constants";

const INPUT = "w-full px-4 py-2.5 bg-surface-container-low border border-surface-container-high rounded-xl text-on-surface font-body-md text-body-md placeholder:text-outline focus:bg-surface-container-lowest focus:border-secondary transition-all outline-none";

// Datos BÁSICOS del negocio, los únicos que se piden al registrarse. El resto (descripción, WhatsApp, dirección…)
// se completa después en el portal, antes de enviar el negocio a revisión.
export default function CamposNegocio({ valor, onChange }) {
  const cambiar = (campo, v) => onChange({ ...valor, [campo]: v });

  return (
    <fieldset className="space-y-3.5 p-4 rounded-2xl bg-secondary-container/15 border border-secondary-container/60">
      <legend className="sr-only">Datos de tu negocio</legend>
      <div className="flex items-start gap-2">
        <span className="material-symbols-outlined text-secondary text-[20px] mt-0.5">storefront</span>
        <div>
          <p className="font-title-sm text-title-sm text-on-surface font-semibold">Datos de tu negocio</p>
          <p className="font-label-xs text-label-xs text-on-surface-variant">
            Solo lo básico por ahora. Al entrar completarás el resto (descripción, WhatsApp, dirección) y recién entonces lo enviarás a revisión.
          </p>
        </div>
      </div>

      <div>
        <label className="block font-label-md text-label-md text-on-surface mb-1.5" htmlFor="nombre_negocio">Nombre del negocio</label>
        <input
          id="nombre_negocio"
          className={INPUT}
          placeholder="Ej. Finca Agroturística El Paraíso"
          required
          maxLength={150}
          value={valor.nombre_negocio}
          onChange={(e) => cambiar("nombre_negocio", e.target.value)}
        />
      </div>

      <div>
        <p className="font-label-md text-label-md text-on-surface mb-1.5">Categoría principal</p>
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
              <span className="flex flex-col min-w-0">
                <span className="font-label-md text-label-md text-on-surface font-semibold">{c.label}</span>
                <span className="font-label-xs text-label-xs text-on-surface-variant">{c.detalle}</span>
              </span>
            </label>
          ))}
        </div>
      </div>

      <div>
        <label className="block font-label-md text-label-md text-on-surface mb-1.5" htmlFor="municipio_negocio">Municipio de operación</label>
        <select id="municipio_negocio" required className={INPUT} value={valor.municipio} onChange={(e) => cambiar("municipio", e.target.value)}>
          <option value="" disabled>Selecciona tu municipio...</option>
          {MUNICIPIOS_CAQUETA.map((m) => <option key={m} value={m}>{m}</option>)}
        </select>
      </div>
    </fieldset>
  );
}
