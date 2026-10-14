import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor, within, fireEvent } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import Itinerario from "./Itinerario";
import { fechaMinima } from "../constants";
import { sumarDias, fechaCorta } from "../utils/fechas";

vi.mock("../components/HistorialItinerarios", () => ({ default: () => null }));
vi.mock("../api/client", () => ({
  urlImagen: (x) => x,
  api: { generarItinerario: vi.fn(), solicitarReserva: vi.fn(), interpretarViaje: vi.fn() },
}));
import { api } from "../api/client";

const INICIO = "2031-03-10";
const items = [
  { id: 1, dia: 1, score: 80, justificacion: "Encaja con tu presupuesto", sitio: { id: 11, nombre: "Cascada La Diabla", categoria: "Naturaleza", municipio: "Morelia", precio: "0", descripcion: "Una cascada", imagen_url: null } },
  { id: 2, dia: 1, score: 60, justificacion: "Cerca del anterior", sitio: { id: 12, nombre: "Karting", categoria: "Aventura", municipio: "Belén", precio: "30000", descripcion: null, imagen_url: null } },
  { id: 3, dia: 2, score: 70, justificacion: "Plan familiar", sitio: { id: 13, nombre: "Piscinas AguaDulce", categoria: "Naturaleza", municipio: "Morelia", precio: "15000", descripcion: "Piscinas", imagen_url: null } },
];
const generado = (extra = {}) => ({ id: 77, dias: 2, presupuesto: 200000, personas: 2, fecha_inicio: INICIO, items, ...extra });

async function generar({ presupuesto = "200000", dias = "2" } = {}) {
  await userEvent.type(screen.getByPlaceholderText("Presupuesto total (COP)"), presupuesto);
  await userEvent.type(screen.getByPlaceholderText("Días de viaje"), dias);
  await userEvent.click(screen.getByRole("button", { name: "Generar itinerario" }));
}

describe("Itinerario: formulario", () => {
  beforeEach(() => {
    api.generarItinerario.mockReset().mockResolvedValue(generado());
    api.solicitarReserva.mockReset();
    api.interpretarViaje.mockReset();
  });

  it("envía lo que el turista indicó, con los intereses elegidos", async () => {
    render(<Itinerario />);
    await userEvent.click(screen.getByRole("button", { name: "familia" }));
    await userEvent.click(screen.getByRole("button", { name: "naturaleza" }));
    await userEvent.clear(screen.getByLabelText("Número de personas"));
    await userEvent.type(screen.getByLabelText("Número de personas"), "4");
    await generar();

    await waitFor(() => expect(api.generarItinerario).toHaveBeenCalledWith({
      presupuesto: 200000, dias: 2, preferencias: "familia,naturaleza", municipio: "", personas: 4, fecha_inicio: fechaMinima(),
    }));
  });

  it("un interés se puede quitar volviéndolo a pulsar", async () => {
    render(<Itinerario />);
    await userEvent.click(screen.getByRole("button", { name: "aventura" }));
    await userEvent.click(screen.getByRole("button", { name: "aventura" }));
    await generar();
    await waitFor(() => expect(api.generarItinerario).toHaveBeenCalledWith(expect.objectContaining({ preferencias: "" })));
  });

  it("muestra el error del servidor y se queda en el formulario", async () => {
    api.generarItinerario.mockRejectedValue(new Error("No hay servicios que encajen con ese presupuesto."));
    render(<Itinerario />);
    await generar({ presupuesto: "10" });
    expect(await screen.findByText("No hay servicios que encajen con ese presupuesto.")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Generar itinerario" })).toBeEnabled();
  });

  describe("«Cuéntanos tu viaje» rellena el formulario", () => {
    const interpretar = async (respuesta) => {
      api.interpretarViaje.mockResolvedValue(respuesta);
      await userEvent.type(screen.getByRole("textbox"), "Escapada de 3 días en Florencia con 500 mil");
      await userEvent.click(screen.getByRole("button", { name: /Interpretar|Entender|Armar|Continuar|Enviar/i }));
    };

    it("aplica lo que entendió y muestra el municipio como filtro que se puede quitar", async () => {
      render(<Itinerario />);
      await interpretar({ presupuesto: 500000, dias: 3, preferencias: ["pareja"], municipio: "Florencia" });
      await waitFor(() => expect(screen.getByPlaceholderText("Presupuesto total (COP)")).toHaveValue(500000));
      expect(screen.getByPlaceholderText("Días de viaje")).toHaveValue(3);
      expect(screen.getByText("Florencia")).toBeInTheDocument();
      await userEvent.click(screen.getByRole("button", { name: "Quitar municipio" }));
      expect(screen.queryByText("Solo en:")).not.toBeInTheDocument();
    });

    it("conserva la fecha de inicio y el número de personas que ya estaban en el formulario", async () => {
      render(<Itinerario />);
      await userEvent.clear(screen.getByLabelText("Número de personas"));
      await userEvent.type(screen.getByLabelText("Número de personas"), "5");
      await interpretar({ presupuesto: 500000, dias: 3, preferencias: [], municipio: "" });
      await waitFor(() => expect(screen.getByPlaceholderText("Días de viaje")).toHaveValue(3));

      await userEvent.click(screen.getByRole("button", { name: "Generar itinerario" }));
      await waitFor(() => expect(api.generarItinerario).toHaveBeenCalledWith(expect.objectContaining({
        dias: 3, personas: 5, fecha_inicio: fechaMinima(), // no se pierden al aplicar lo que entendió la IA
      })));
    });

    it("lo que la IA no detectó se deja como estaba", async () => {
      render(<Itinerario />);
      await userEvent.type(screen.getByPlaceholderText("Presupuesto total (COP)"), "150000");
      await userEvent.click(screen.getByRole("button", { name: "familia" }));
      await interpretar({ presupuesto: null, dias: 4, preferencias: [], municipio: "" });
      await waitFor(() => expect(screen.getByPlaceholderText("Días de viaje")).toHaveValue(4));
      expect(screen.getByPlaceholderText("Presupuesto total (COP)")).toHaveValue(150000);
      await userEvent.click(screen.getByRole("button", { name: "Generar itinerario" }));
      await waitFor(() => expect(api.generarItinerario).toHaveBeenCalledWith(expect.objectContaining({ preferencias: "familia", dias: 4 })));
    });
  });
});

describe("Itinerario: resultado", () => {
  beforeEach(() => {
    api.generarItinerario.mockReset().mockResolvedValue(generado());
    api.solicitarReserva.mockReset().mockResolvedValue({ id: 1 });
    api.interpretarViaje.mockReset();
  });

  const abrir = async (respuesta) => {
    if (respuesta) api.generarItinerario.mockResolvedValue(respuesta);
    render(<Itinerario />);
    await generar();
    await screen.findByText("Tu itinerario personalizado en el Caquetá");
  };
  const tarjeta = (nombre) => screen.getByRole("heading", { level: 3, name: nombre }).closest("div.rounded-2xl");

  it("muestra el resumen real: días, actividades, presupuesto usado y municipios", async () => {
    await abrir();
    expect(screen.getByText("Itinerario #77")).toBeInTheDocument();
    expect(screen.getByText("Puntaje promedio: 70")).toBeInTheDocument(); // (80 + 60 + 70) / 3
    expect(screen.getByText("3 incluidas")).toBeInTheDocument();
    // (0 + 30.000 + 15.000) × 2 personas
    expect(screen.getByText("$90.000 / $200.000")).toBeInTheDocument();
    expect(within(screen.getByText("Total estimado:").parentElement).getByText("$90.000 COP")).toBeInTheDocument();
    expect(screen.getByText(/Morelia, Belén/)).toBeInTheDocument();
    expect(screen.getByText("2 municipio(s) en tu itinerario")).toBeInTheDocument();
  });

  it("agrupa las actividades por día con su fecha real y cada precio es por el grupo", async () => {
    await abrir();
    expect(screen.getByRole("button", { name: `Día 1 · ${fechaCorta(INICIO)}` })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: `Día 2 · ${fechaCorta(sumarDias(INICIO, 1))}` })).toBeInTheDocument();
    expect(within(tarjeta("Cascada La Diabla")).getByText("Gratuito")).toBeInTheDocument();
    expect(within(tarjeta("Karting")).getByText("60.000 COP")).toBeInTheDocument();
    expect(within(tarjeta("Karting")).getByText("(2 personas)")).toBeInTheDocument();
    expect(within(tarjeta("Karting")).getByText("Sin descripción disponible.")).toBeInTheDocument();
    expect(within(tarjeta("Karting")).getByText("Cerca del anterior")).toBeInTheDocument();
  });

  it("las pestañas por día filtran lo que se ve", async () => {
    await abrir();
    await userEvent.click(screen.getByRole("button", { name: /^Día 2 ·/ }));
    expect(screen.queryByRole("heading", { level: 3, name: "Karting" })).not.toBeInTheDocument();
    expect(screen.getByRole("heading", { level: 3, name: "Piscinas AguaDulce" })).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: /Vista Completa/ }));
    expect(screen.getByRole("heading", { level: 3, name: "Karting" })).toBeInTheDocument();
  });

  it("cambiar las personas recalcula los precios y el total", async () => {
    await abrir();
    fireEvent.change(screen.getByDisplayValue("2"), { target: { value: "3" } });
    expect(within(tarjeta("Karting")).getByText("90.000 COP")).toBeInTheDocument();
    expect(within(screen.getByText("Total estimado:").parentElement).getByText("$135.000 COP")).toBeInTheDocument(); // 45.000 × 3
  });

  it("reservar una actividad envía su fecha real (inicio + día) y las personas, y queda marcada", async () => {
    await abrir();
    await userEvent.click(within(tarjeta("Piscinas AguaDulce")).getByRole("button", { name: /Reservar/ }));

    await waitFor(() => expect(api.solicitarReserva).toHaveBeenCalledWith({ sitio_id: 13, fecha_servicio: sumarDias(INICIO, 1), personas: 2 }));
    expect(await within(tarjeta("Piscinas AguaDulce")).findByRole("button", { name: /Reservado/ })).toBeDisabled();
    expect(screen.getByText(/Solicitud enviada para "Piscinas AguaDulce"/)).toBeInTheDocument();
  });

  it("si una reserva falla lo dice y deja reintentar", async () => {
    api.solicitarReserva.mockRejectedValue(new Error("No hay cupos suficientes para ese día."));
    await abrir();
    await userEvent.click(within(tarjeta("Karting")).getByRole("button", { name: /Reservar/ }));
    expect(await screen.findByText('Error al reservar "Karting": No hay cupos suficientes para ese día.')).toBeInTheDocument();
    expect(within(tarjeta("Karting")).getByRole("button", { name: /Reservar/ })).toBeEnabled();
  });

  it("«Reservar todo» pide cada actividad y cuenta las que no se pudieron", async () => {
    api.solicitarReserva.mockImplementation(({ sitio_id }) => (sitio_id === 12 ? Promise.reject(new Error("Sin cupo")) : Promise.resolve({ id: 1 })));
    await abrir();
    await userEvent.click(screen.getAllByRole("button", { name: /Reservar todo el itinerario/ })[0]);

    await waitFor(() => expect(screen.getByText(/2 de 3 solicitudes de reserva enviadas/)).toBeInTheDocument());
    expect(screen.getByText(/No se pudieron reservar: "Karting" \(.+\): Sin cupo/)).toBeInTheDocument();
    expect(api.solicitarReserva).toHaveBeenCalledTimes(3);
    // las reservadas quedan marcadas y «Reservar todo» sigue disponible por la que falló
    expect(within(tarjeta("Cascada La Diabla")).getByRole("button", { name: /Reservado/ })).toBeInTheDocument();
    expect(within(tarjeta("Karting")).getByRole("button", { name: /Reservar$/ })).toBeEnabled();
  });

  it("con todo reservado el botón lo indica y se desactiva", async () => {
    await abrir();
    await userEvent.click(screen.getAllByRole("button", { name: /Reservar todo el itinerario/ })[0]);
    await waitFor(() => expect(screen.getAllByRole("button", { name: /Todo reservado/ })).toHaveLength(2));
    for (const b of screen.getAllByRole("button", { name: /Todo reservado/ })) expect(b).toBeDisabled();
  });

  it("cambiar la fecha de inicio mueve las fechas de cada día", async () => {
    await abrir();
    const fecha = screen.getByDisplayValue(INICIO);
    fireEvent.change(fecha, { target: { value: "2031-04-01" } });
    await userEvent.click(within(tarjeta("Piscinas AguaDulce")).getByRole("button", { name: /Reservar/ }));
    await waitFor(() => expect(api.solicitarReserva).toHaveBeenCalledWith(expect.objectContaining({ fecha_servicio: "2031-04-02" })));
  });

  it("incluye la versión imprimible y los botones para guardar y compartir", async () => {
    await abrir();
    expect(screen.getByRole("button", { name: /Guardar PDF/ })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Compartir/ })).toBeInTheDocument();
    expect(screen.getByLabelText("Itinerario para imprimir")).toBeInTheDocument();
  });

  it("«Crear Itinerario IA» vuelve al formulario y empieza de cero las reservas", async () => {
    await abrir();
    await userEvent.click(screen.getByRole("button", { name: "Crear Itinerario IA" }));
    expect(screen.getByRole("heading", { name: "Genera tu itinerario personalizado" })).toBeInTheDocument();
  });
});
