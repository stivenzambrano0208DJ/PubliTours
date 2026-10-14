import InterpretarViaje from "../InterpretarViaje";
import { fechaMinima } from "../../constants";
import { pesos } from "../../utils/moneda";

const OPCIONES_INTERES = [
  { valor: "pareja", icono: "favorite" },
  { valor: "familia", icono: "family_restroom" },
  { valor: "naturaleza", icono: "forest" },
  { valor: "aventura", icono: "hiking" },
  { valor: "negocios", icono: "business_center" },
];
const PASOS = ["Cuéntanos tu viaje", "Revisa los datos", "Recibe tu plan"];

// Cuánto le toca a cada persona por día: solo aritmética sobre lo que escribió el turista.
function presupuestoPorPersonaDia({ presupuesto, dias, personas }) {
  const total = Number(presupuesto), d = Number(dias), p = Number(personas);
  if (!(total > 0) || !(d > 0) || !(p > 0)) return null;
  return total / d / p;
}
const CAMPO = "w-full px-4 py-3 rounded-xl bg-surface font-body-md text-body-md border border-outline-variant/40 focus:outline-none focus:ring-2 focus:ring-secondary";
const ETIQUETA = "flex items-center gap-1.5 font-label-md text-label-md text-on-surface-variant px-1";

// El icono va fuera de la etiqueta para que el nombre accesible del campo sea solo su texto.
function Campo({ id, icono, texto, children }) {
  return (
    <div className="flex flex-col gap-1">
      <div className={ETIQUETA}>
        <span className="material-symbols-outlined text-[16px]" aria-hidden="true">{icono}</span>
        <label htmlFor={id}>{texto}</label>
      </div>
      {children}
    </div>
  );
}

// Pantalla previa al itinerario: la IA interpreta el texto libre y el turista revisa los campos antes de generar.
export default function FormularioItinerario({ form, setForm, onToggleInteres, onInterpretacion, onSubmit, cargando, error }) {
  const porPersonaDia = presupuestoPorPersonaDia(form);
  return (
    <div className="max-w-2xl mx-auto px-gutter py-space-xl">
      <div className="text-center mb-space-lg">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-secondary-container/30 text-secondary font-label-xs text-label-xs mb-3">
          <span className="material-symbols-outlined text-[16px]">auto_awesome</span>
          <span>Motor de scoring PubliTours</span>
        </div>
        <h1 className="font-headline-xl text-headline-xl text-primary tracking-tight">Genera tu itinerario personalizado</h1>
        <p className="font-body-md text-body-md text-on-surface-variant mt-2">
          Indica tu presupuesto, duración e intereses. El sistema combina las mejores opciones del catálogo verificado.
        </p>
      </div>

      <ol className="flex items-center justify-center gap-2 sm:gap-3 mb-space-md font-label-xs text-label-xs text-on-surface-variant" aria-label="Pasos">
        {PASOS.map((p, i) => (
          <li key={p} className="flex items-center gap-2">
            <span className={`w-6 h-6 rounded-full flex items-center justify-center font-bold ${i < 2 ? "bg-primary text-on-primary" : "bg-surface-container-high text-on-surface-variant"}`}>{i + 1}</span>
            <span className="hidden sm:inline">{p}</span>
            {i < PASOS.length - 1 && <span className="w-4 sm:w-8 h-px bg-outline-variant" aria-hidden="true" />}
          </li>
        ))}
      </ol>

      <InterpretarViaje onResultado={onInterpretacion} />

      <div className="flex items-center gap-3 my-space-md font-label-xs text-label-xs text-on-surface-variant" aria-hidden="true">
        <span className="flex-1 h-px bg-outline-variant/60" />
        <span>o completa los datos tú mismo</span>
        <span className="flex-1 h-px bg-outline-variant/60" />
      </div>

      <form className="p-space-lg rounded-2xl bg-surface-container-lowest shadow-md flex flex-col gap-space-md" onSubmit={onSubmit}>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <Campo id="iti-presupuesto" icono="payments" texto="Presupuesto total">
            <input
              id="iti-presupuesto" type="number" placeholder="Presupuesto total (COP)" required min="1" className={CAMPO}
              value={form.presupuesto} onChange={(e) => setForm({ ...form, presupuesto: e.target.value })}
            />
          </Campo>
          <Campo id="iti-dias" icono="calendar_month" texto="Días de viaje">
            <input
              id="iti-dias" type="number" placeholder="Días de viaje" required min="1" className={CAMPO}
              value={form.dias} onChange={(e) => setForm({ ...form, dias: e.target.value })}
            />
          </Campo>
          <Campo id="iti-fecha" icono="event" texto="Fecha de inicio">
            <input id="iti-fecha" type="date" required min={fechaMinima()} className={CAMPO} value={form.fecha_inicio} onChange={(e) => setForm({ ...form, fecha_inicio: e.target.value })} />
          </Campo>
          <Campo id="iti-personas" icono="group" texto="Número de personas">
            <input id="iti-personas" type="number" required min="1" max="100" className={CAMPO} value={form.personas} onChange={(e) => setForm({ ...form, personas: e.target.value })} />
          </Campo>
        </div>
        {porPersonaDia && (
          <p className="flex items-center gap-2 px-3 py-2 rounded-xl bg-secondary-container/30 text-on-secondary-container font-body-sm text-body-sm" aria-live="polite">
            <span className="material-symbols-outlined text-[18px]" aria-hidden="true">info</span>
            Tendrás unos {pesos(Math.round(porPersonaDia))} por persona al día.
          </p>
        )}

        <div>
          <p className="font-label-md text-label-md text-on-surface-variant mb-2">¿Qué te interesa? <span className="font-label-xs text-label-xs">(puedes elegir varios)</span></p>
          <div className="flex flex-wrap gap-2">
            {OPCIONES_INTERES.map(({ valor, icono }) => {
              const activo = form.preferencias.includes(valor);
              return (
                <button
                  type="button" key={valor} onClick={() => onToggleInteres(valor)} aria-pressed={activo}
                  className={`inline-flex items-center gap-1.5 px-4 py-2 rounded-full font-label-md text-label-md capitalize transition-all focus:outline-none focus:ring-2 focus:ring-secondary ${
                    activo ? "bg-secondary text-on-secondary shadow-sm" : "bg-surface-container text-on-surface-variant hover:bg-surface-container-high"
                  }`}
                >
                  <span className="material-symbols-outlined text-[16px]" aria-hidden="true">{activo ? "check" : icono}</span>
                  {valor}
                </button>
              );
            })}
          </div>
        </div>

        {form.municipio && (
          <div className="flex items-center gap-2">
            <span className="font-label-md text-label-md text-on-surface-variant">Solo en:</span>
            <span className="inline-flex items-center gap-1 pl-3 pr-1 py-1 rounded-full bg-secondary-container/50 font-label-md text-label-md text-on-secondary-container">
              {form.municipio}
              <button type="button" aria-label="Quitar municipio" onClick={() => setForm({ ...form, municipio: "" })} className="w-5 h-5 rounded-full hover:bg-secondary-container flex items-center justify-center">
                <span className="material-symbols-outlined text-[14px]">close</span>
              </button>
            </span>
          </div>
        )}

        {error && <p role="alert" className="p-3 rounded-xl bg-error-container text-on-error-container font-body-sm text-body-sm">{error}</p>}
        <button type="submit" disabled={cargando} className="py-3.5 rounded-xl bg-primary text-on-primary font-title-sm text-title-sm hover:bg-primary-container transition-all disabled:opacity-60">
          <span className="inline-flex items-center justify-center gap-2">
            <span className="material-symbols-outlined text-[20px]" aria-hidden="true">{cargando ? "hourglass_top" : "route"}</span>
            {cargando ? "Generando..." : "Generar itinerario"}
          </span>
        </button>
      </form>
    </div>
  );
}
