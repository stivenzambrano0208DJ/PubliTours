import { useGeneradorItinerario } from "../hooks/useGeneradorItinerario";
import { fechaMinima } from "../constants";
import FormularioItinerario from "../components/itinerario/FormularioItinerario";
import ResultadoItinerario from "../components/itinerario/ResultadoItinerario";

// Generador de itinerarios: primero el formulario (con la IA que interpreta texto libre) y luego el plan resultante.
export default function Itinerario() {
  const generador = useGeneradorItinerario();
  const { itinerario, form } = generador;

  if (!itinerario) {
    return (
      <FormularioItinerario
        form={form} setForm={generador.setForm} onToggleInteres={generador.toggleInteres}
        onInterpretacion={generador.aplicarInterpretacion} onSubmit={generador.generar}
        cargando={generador.cargando} error={generador.error}
      />
    );
  }

  return (
    <ResultadoItinerario
      key={itinerario.id}
      itinerario={itinerario}
      fechaInicioInicial={itinerario.fecha_inicio || form.fecha_inicio || fechaMinima()}
      personasIniciales={itinerario.personas || 1}
      onVolver={generador.volver}
    />
  );
}
