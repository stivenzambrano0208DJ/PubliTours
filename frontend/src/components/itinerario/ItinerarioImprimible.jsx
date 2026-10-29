import { fechaDelDia, fechaCorta } from "../../utils/fechas";
import { itemsPorDia, totalEstimado } from "../../utils/itinerario";
import { pesos } from "../../utils/moneda";
import { useIdioma } from "../../context/idioma";


// Versión limpia del itinerario: solo se ve al imprimir o guardar como PDF (el resto de la página se oculta).
export default function ItinerarioImprimible({ itinerario, fechaInicio, personas }) {
  const { t, locale } = useIdioma();
  const dias = itemsPorDia(itinerario.items);
  const total = totalEstimado(itinerario.items, personas);

  return (
    <article className="hidden print:block px-6 py-4 text-on-surface" aria-label={t("Itinerario para imprimir")}>
      <header className="border-b border-outline pb-3 mb-4">
        <p className="font-label-md text-label-md text-secondary font-semibold">PubliTours · Caquetá Vive IA</p>
        <h1 className="font-headline-md text-headline-md text-primary font-bold">{t("Mi itinerario en el Caquetá")}</h1>
        <p className="font-body-md text-body-md">
          {t("{n} día(s)", { n: itinerario.dias })} · {(personas === 1 ? t("1 persona", { n: personas }) : t("{n} personas", { n: personas }))} · {t("inicio {fecha}", { fecha: fechaCorta(fechaInicio, locale) })}
        </p>
      </header>

      {dias.map(({ dia, items }) => (
        <section key={dia} className="mb-4 break-inside-avoid">
          <h2 className="font-title-md text-title-md text-primary font-semibold capitalize">{t("Día {n}", { n: dia })} · {fechaCorta(fechaDelDia(fechaInicio, dia), locale)}</h2>
          <ul className="mt-1 flex flex-col gap-1.5">
            {items.map(({ id, sitio }) => (
              <li key={id} className="flex justify-between gap-4 border-b border-outline-variant pb-1.5">
                <span>
                  <strong>{sitio.nombre}</strong> · {sitio.municipio}
                  <span className="block font-body-sm text-body-sm text-on-surface-variant">{sitio.categoria}</span>
                </span>
                <span className="shrink-0 font-semibold">{Number(sitio.precio) === 0 ? "Gratis" : pesos(Number(sitio.precio) * personas)}</span>
              </li>
            ))}
          </ul>
        </section>
      ))}

      <footer className="mt-4 pt-3 border-t border-outline flex justify-between items-baseline">
        <span className="font-label-md text-label-md font-semibold">{t("Total estimado ({personas})", { personas: (personas === 1 ? t("1 persona", { n: personas }) : t("{n} personas", { n: personas })) })}</span>
        <span className="font-title-md text-title-md text-primary font-bold">{pesos(total)} COP</span>
      </footer>
      <p className="mt-3 font-label-xs text-label-xs text-on-surface-variant">
        {t("Precios por persona según el catálogo al generar el plan; cada reserva debe ser confirmada por su prestador.")}
      </p>
    </article>
  );
}
