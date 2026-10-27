import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import MisReservas from "./MisReservas";

const navigate = vi.fn();
vi.mock("react-router-dom", async (original) => ({ ...(await original()), useNavigate: () => navigate }));
vi.mock("../context/auth", () => ({ useAuth: () => ({ usuario: { id: 1, nombre: "Ana Pérez", rol: "turista" } }) }));
vi.mock("../components/reservas/ModalCalificar", () => ({
  default: ({ reserva, onCerrar, onGuardado }) => (
    <div data-testid="modal-calificar">
      Calificar {reserva.id}
      <button onClick={() => onGuardado({ id: 5, calificacion: 4 })}>guardar calificación</button>
      <button onClick={onCerrar}>cerrar calificación</button>
    </div>
  ),
}));
vi.mock("../components/reservas/EditarReserva", () => ({
  default: ({ reserva, onCerrar, onGuardada }) => (
    <div data-testid="modal-editar">
      Editar {reserva.id}
      <button onClick={() => onGuardada({ personas: 6 })}>guardar edición</button>
      <button onClick={onCerrar}>cerrar edición</button>
    </div>
  ),
}));
vi.mock("../api/client", () => ({
  urlImagen: (x) => x,
  api: { configuracion: vi.fn(), misReservas: vi.fn(), cancelarReserva: vi.fn() },
}));
import { api } from "../api/client";

const dia = (n) => new Date(Date.now() + n * 864e5).toLocaleDateString("en-CA");
const reserva = (id, estado, extra = {}) => ({
  id, estado, fecha_servicio: dia(10), fecha_solicitud: "2031-01-05T10:00:00Z", personas: 2, ninos: 0, total: "50000", codigo: `PT-AAAA0${id}`,
  politica_cancelacion: "flexible", paquete: null, resena: null, prestador: { nombre_negocio: `Negocio ${id}` },
  sitio: { id, nombre: `Servicio ${id}`, categoria: "Naturaleza", municipio: "Morelia", imagen_url: null }, ...extra,
});
const CONFIG = { comision_pct: 10, politicas_cancelacion: { flexible: 1, moderada: 3, estricta: 7 }, dias_gracia_asistencia: 3 };

function montar(lista) {
  api.misReservas.mockResolvedValue(lista);
  return render(<MemoryRouter><MisReservas /></MemoryRouter>);
}
const tarjeta = (nombre) => screen.getByRole("heading", { level: 2, name: nombre }).closest("article");

describe("MisReservas", () => {
  beforeEach(() => {
    navigate.mockReset();
    api.configuracion.mockReset().mockResolvedValue(CONFIG);
    api.misReservas.mockReset();
    api.cancelarReserva.mockReset();
  });

  it("saluda y resume lo real: total confirmado, cantidad y próxima fecha", async () => {
    montar([
      reserva(1, "confirmada", { fecha_servicio: dia(20), total: "50000" }),
      reserva(2, "confirmada", { fecha_servicio: dia(5), total: "30000" }),
      reserva(3, "completada", { fecha_servicio: dia(-9), total: "20000" }),
      reserva(4, "pendiente", { total: "99999" }), // no es dinero confirmado
    ]);
    expect(await screen.findByRole("heading", { name: "¡Hola, Ana Pérez!" })).toBeInTheDocument();
    expect(screen.getByText("$100.000")).toBeInTheDocument(); // 50.000 + 30.000 + 20.000
    expect(screen.getByText("Reservas totales").nextSibling).toHaveTextContent("4");
    expect(screen.getByText("Próxima confirmada").nextSibling).toHaveTextContent(dia(5));
    // el banner del próximo viaje es la confirmada más cercana
    expect(screen.getByText("Tu próximo viaje confirmado")).toBeInTheDocument();
    expect(within(screen.getByText("Tu próximo viaje confirmado").closest("div").parentElement).getByRole("heading", { name: "Servicio 2" })).toBeInTheDocument();
  });

  it("sin reservas lo dice y ofrece generar un itinerario", async () => {
    montar([]);
    expect(await screen.findByText(/Aún no tienes reservas/)).toBeInTheDocument();
    expect(screen.queryByText("Tu próximo viaje confirmado")).not.toBeInTheDocument();
    expect(screen.getByText("Próxima confirmada").nextSibling).toHaveTextContent("—");
    await userEvent.click(screen.getAllByRole("button", { name: /Generar itinerario/ })[0]);
    expect(navigate).toHaveBeenCalledWith("/itinerario");
  });

  it("muestra el error si no se pueden cargar", async () => {
    api.misReservas.mockRejectedValue(new Error("Sesión vencida."));
    render(<MemoryRouter><MisReservas /></MemoryRouter>);
    expect(await screen.findByText("Sesión vencida.")).toBeInTheDocument();
  });

  it("cada filtro cuenta sus reservas, incluidas las que no asistió, y filtra la lista", async () => {
    montar([
      reserva(1, "confirmada"), reserva(2, "pendiente"), reserva(3, "pendiente"), reserva(4, "completada", { fecha_servicio: dia(-9) }),
      reserva(5, "no_asistio", { fecha_servicio: dia(-9) }), reserva(6, "rechazada"), reserva(7, "cancelada"),
    ]);
    await screen.findAllByRole("article");
    const contador = (texto) => screen.getByRole("button", { name: new RegExp(`^${texto}\\s*\\d`) }).textContent.replace(texto, "");
    expect(contador("Todas")).toBe("7");
    expect(contador("Pendientes")).toBe("2");
    expect(contador("Confirmadas")).toBe("1");
    expect(contador("No asistidas")).toBe("1"); // antes salía vacío

    await userEvent.click(screen.getByRole("button", { name: /^Pendientes/ }));
    expect(screen.getAllByRole("article")).toHaveLength(2);
    await userEvent.click(screen.getByRole("button", { name: /^No asistidas/ }));
    expect(screen.getAllByRole("article")).toHaveLength(1);
    expect(screen.getByText("NO ASISTIÓ")).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: /^Rechazadas/ }));
    expect(screen.getByRole("heading", { level: 2, name: "Servicio 6" })).toBeInTheDocument();
  });

  it("busca por servicio, municipio o prestador y avisa cuando nada coincide", async () => {
    montar([
      reserva(1, "pendiente", { sitio: { id: 1, nombre: "Cascada La Diabla", categoria: "Naturaleza", municipio: "Morelia" } }),
      reserva(2, "pendiente", { sitio: { id: 2, nombre: "Karting", categoria: "Aventura", municipio: "Belén" }, prestador: { nombre_negocio: "Motor Caquetá" } }),
    ]);
    await screen.findAllByRole("article");
    const buscador = screen.getByPlaceholderText(/Buscar por sitio/);
    await userEvent.type(buscador, "belén");
    expect(screen.getAllByRole("article")).toHaveLength(1);
    await userEvent.clear(buscador);
    await userEvent.type(buscador, "motor");
    expect(screen.getByRole("heading", { level: 2, name: "Karting" })).toBeInTheDocument();
    await userEvent.clear(buscador);
    await userEvent.type(buscador, "zzz");
    expect(screen.getByText("No hay reservas que coincidan con el filtro.")).toBeInTheDocument();
  });

  it("una reserva pendiente lo explica y se puede modificar o cancelar", async () => {
    montar([reserva(1, "pendiente")]);
    const t = within(await screen.findByRole("article"));
    expect(t.getByText("PENDIENTE")).toBeInTheDocument();
    expect(t.getByText(/Esperando confirmación del prestador/)).toBeInTheDocument();
    expect(t.getByText("Prestador:", { exact: false })).toHaveTextContent("Negocio 1");
    expect(t.queryByRole("link", { name: /comprobante/ })).not.toBeInTheDocument(); // aún no vale
    expect(t.getByRole("button", { name: /Modificar reserva/ })).toBeInTheDocument();
    expect(t.getByRole("button", { name: /Cancelar reserva/ })).toBeInTheDocument();
  });

  it("una confirmada futura ofrece el comprobante con su código", async () => {
    montar([reserva(1, "confirmada")]);
    const link = await screen.findByRole("link", { name: /Ver comprobante · PT-AAAA01/ });
    expect(link).toHaveAttribute("href", "/comprobante/1");
  });

  it("una rechazada muestra el motivo del prestador, o un texto por defecto", async () => {
    montar([reserva(1, "rechazada", { motivo_rechazo: "Estamos en mantenimiento" }), reserva(2, "rechazada")]);
    await screen.findAllByRole("article");
    expect(screen.getByText("Motivo del prestador: Estamos en mantenimiento")).toBeInTheDocument();
    expect(screen.getByText("El prestador no pudo confirmar esta solicitud.")).toBeInTheDocument();
  });

  it("los paquetes se distinguen y listan lo que incluyen", async () => {
    montar([reserva(1, "pendiente", { paquete: { nombre: "Ruta del río", items: [{ sitio: { nombre: "Cascada" } }, { sitio: { nombre: "Karting" } }] } })]);
    const t = within(await screen.findByRole("article"));
    expect(t.getByText("Paquete")).toBeInTheDocument();
    expect(t.getByRole("heading", { level: 2, name: /Ruta del río/ })).toBeInTheDocument();
    expect(t.getByText("Incluye: Cascada + Karting")).toBeInTheDocument();
  });

  it("una reserva gratuita no muestra moneda", async () => {
    montar([reserva(1, "pendiente", { total: "0.00" })]);
    const t = within(await screen.findByRole("article"));
    expect(t.getByText("Gratuito")).toBeInTheDocument();
    expect(t.queryByText("COP")).not.toBeInTheDocument();
  });

  describe("acciones", () => {
    it("cancelar quita la reserva de las pendientes y la marca cancelada", async () => {
      vi.spyOn(window, "confirm").mockReturnValue(true);
      api.cancelarReserva.mockResolvedValue({ estado: "cancelada", cancelacion_tardia: false });
      montar([reserva(1, "pendiente")]);
      await userEvent.click(await screen.findByRole("button", { name: /Cancelar reserva/ }));
      await waitFor(() => expect(api.cancelarReserva).toHaveBeenCalledWith(1));
      expect(await screen.findByText("CANCELADA")).toBeInTheDocument();
      expect(screen.getByText(/Cancelaste esta reserva\./)).toBeInTheDocument();
      expect(screen.queryByRole("button", { name: /Cancelar reserva/ })).not.toBeInTheDocument();
      window.confirm.mockRestore();
    });

    it("si cancelar falla avisa y la reserva sigue igual", async () => {
      vi.spyOn(window, "confirm").mockReturnValue(true);
      const alerta = vi.spyOn(window, "alert").mockImplementation(() => {});
      api.cancelarReserva.mockRejectedValue(new Error("Ya no se puede cancelar."));
      montar([reserva(1, "pendiente")]);
      await userEvent.click(await screen.findByRole("button", { name: /Cancelar reserva/ }));
      await waitFor(() => expect(alerta).toHaveBeenCalledWith("Ya no se puede cancelar."));
      expect(screen.getByText("PENDIENTE")).toBeInTheDocument();
      window.confirm.mockRestore();
      alerta.mockRestore();
    });

    it("modificar abre el editor y lo guardado se refleja en la tarjeta", async () => {
      montar([reserva(1, "pendiente")]);
      await userEvent.click(await screen.findByRole("button", { name: /Modificar reserva/ }));
      expect(screen.getByTestId("modal-editar")).toHaveTextContent("Editar 1");
      await userEvent.click(screen.getByRole("button", { name: "guardar edición" }));
      expect(screen.queryByTestId("modal-editar")).not.toBeInTheDocument();
      expect(within(tarjeta("Servicio 1")).getByText("6 personas")).toBeInTheDocument();
    });

    it("calificar abre el formulario y la calificación guardada se muestra", async () => {
      montar([reserva(1, "completada", { fecha_servicio: dia(-9) })]);
      await userEvent.click(await screen.findByRole("button", { name: /Calificar experiencia/ }));
      expect(screen.getByTestId("modal-calificar")).toHaveTextContent("Calificar 1");
      await userEvent.click(screen.getByRole("button", { name: "guardar calificación" }));
      expect(await screen.findByText("Tu calificación")).toBeInTheDocument();
      expect(screen.queryByRole("button", { name: /Calificar experiencia/ })).not.toBeInTheDocument();
    });

    it("una completada ya calificada muestra su calificación y no pide otra", async () => {
      montar([reserva(1, "completada", { fecha_servicio: dia(-9), resena: { calificacion: 5 } })]);
      expect(await screen.findByText("Tu calificación")).toBeInTheDocument();
      expect(screen.queryByRole("button", { name: /Calificar experiencia/ })).not.toBeInTheDocument();
    });
  });
});
