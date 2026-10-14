import { useState } from "react";
import { useReservasItinerario } from "../../hooks/useReservasItinerario";
import { resumenItinerario } from "../../utils/itinerario";
import HistorialItinerarios from "../HistorialItinerarios";
import ItinerarioImprimible from "../ItinerarioImprimible";
import EncabezadoItinerario from "./EncabezadoItinerario";
import ResumenRapido from "./ResumenRapido";
import LineaDelTiempo from "./LineaDelTiempo";
import PanelLateralItinerario from "./PanelLateralItinerario";

// El plan generado. La fecha de inicio y las personas parten de lo pedido y el turista puede ajustarlas: de ellas dependen
// la fecha de cada reserva y los precios. Se monta con key = id del itinerario, así cada plan nuevo empieza sin reservas marcadas.
export default function ResultadoItinerario({ itinerario, fechaInicioInicial, personasIniciales, onVolver }) {
  const [fechaInicio, setFechaInicio] = useState(fechaInicioInicial);
  const [personas, setPersonas] = useState(personasIniciales);
  const reservas = useReservasItinerario({ itinerario, fechaInicio, personas });
  const { municipios, presupuestoUsado, puntajePromedio } = resumenItinerario(itinerario, personas);

  return (
    <>
      <div className="flex flex-col w-full print:hidden">
        <EncabezadoItinerario
          itinerario={itinerario} municipios={municipios} puntajePromedio={puntajePromedio}
          fechaInicio={fechaInicio} onFechaInicio={setFechaInicio} personas={personas} onPersonas={setPersonas}
          todoReservado={reservas.todoReservado} onReservarTodo={reservas.reservarTodo} onVolver={onVolver}
        />
        <ResumenRapido itinerario={itinerario} municipios={municipios} presupuestoUsado={presupuestoUsado} />

        {reservas.mensaje && (
          <div className="max-w-[1360px] mx-auto px-gutter mt-space-md w-full">
            <p className="p-3 rounded-xl bg-secondary-container/20 text-primary font-body-sm text-body-sm">{reservas.mensaje}</p>
          </div>
        )}

        <section className="w-full py-space-xl">
          <div className="max-w-[1360px] mx-auto px-gutter grid grid-cols-1 lg:grid-cols-12 gap-space-lg items-start">
            <LineaDelTiempo
              items={itinerario.items} fechaInicio={fechaInicio} personas={personas}
              reservando={reservas.reservando} reservados={reservas.reservados} onReservar={reservas.reservarItem}
            />
            <PanelLateralItinerario
              itinerario={itinerario} municipios={municipios} presupuestoUsado={presupuestoUsado}
              fechaInicio={fechaInicio} personas={personas} todoReservado={reservas.todoReservado} onReservarTodo={reservas.reservarTodo}
            />
          </div>
        </section>

        <div className="max-w-[1360px] w-full mx-auto px-gutter pb-space-xl">
          <HistorialItinerarios recargarKey={itinerario.id} />
        </div>
      </div>
      <ItinerarioImprimible itinerario={itinerario} fechaInicio={fechaInicio} personas={personas} />
    </>
  );
}
