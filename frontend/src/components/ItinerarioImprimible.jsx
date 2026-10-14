import { fechaDelDia, fechaCorta } from "../utils/fechas";
import { itemsPorDia, totalEstimado } from "../utils/itinerario";
import { pesos } from "../utils/moneda";


// Versión limpia del itinerario: solo se ve al imprimir o guardar como PDF (el resto de la página se oculta).
export default function ItinerarioImprimible({ itinerario, fechaInicio, personas }) {
  const dias = itemsPorDia(itinerario.items);
  const total = totalEstimado(itinerario.items, personas);

  return (
    <article className="hidden print:block px-6 py-4 text-on-surface" aria-label="Itinerario para imprimir">
      <header className="border-b border-outline pb-3 mb-4">
        <p className="font-label-md text-label-md text-secondary font-semibold">PubliTours · Caquetá Vive IA</p>
        <h1 className="font-headline-md text-headline-md text-primary font-bold">Mi itinerario en el Caquetá</h1>
        <p className="font-body-md text-body-md">
          {itinerario.dias} día(s) · {personas} persona{personas === 1 ? "" : "s"} · inicio {fechaCorta(fechaInicio)}
        </p>
      </header>

      {dias.map(({ dia, items }) => (
        <section key={dia} className="mb-4 break-inside-avoid">
          <h2 className="font-title-md text-title-md text-primary font-semibold capitalize">Día {dia} · {fechaCorta(fechaDelDia(fechaInicio, dia))}</h2>
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
        <span className="font-label-md text-label-md font-semibold">Total estimado ({personas} persona{personas === 1 ? "" : "s"})</span>
        <span className="font-title-md text-title-md text-primary font-bold">{pesos(total)} COP</span>
      </footer>
      <p className="mt-3 font-label-xs text-label-xs text-on-surface-variant">
        Precios por persona según el catálogo al generar el plan; cada reserva debe ser confirmada por su prestador.
      </p>
    </article>
  );
}
