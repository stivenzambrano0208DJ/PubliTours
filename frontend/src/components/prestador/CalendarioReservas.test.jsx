import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import CalendarioReservas from "./CalendarioReservas";
import ReservasRecibidas from "./ReservasRecibidas";

const reserva = (id, fecha_servicio, estado, extra = {}) => ({
  id, fecha_servicio, estado, personas: 2, total: "50000", turista: { nombre: `Turista ${id}` }, sitio: { nombre: "Karting" }, paquete: null, ...extra,
});
const reservas = [
  reserva(1, "2031-03-12", "pendiente"),
  reserva(2, "2031-03-12", "confirmada"),
  reserva(3, "2031-03-12", "confirmada", { paquete: { nombre: "Ruta del río" }, sitio: null }),
  reserva(4, "2031-03-20", "rechazada"),
  reserva(5, "2031-03-21", "cancelada"),
  reserva(6, "2031-04-02", "pendiente"),
];
const dia = (n) => screen.getByRole("button", { name: new RegExp(`^${n} de marzo`) });

describe("CalendarioReservas", () => {
  beforeEach(() => { vi.useFakeTimers({ toFake: ["Date"] }); vi.setSystemTime(new Date("2031-03-10T12:00:00")); });
  afterEach(() => vi.useRealTimers());

  it("abre en el mes de la próxima reserva y cuenta pendientes y confirmadas por día", () => {
    render(<CalendarioReservas reservas={reservas} />);
    expect(screen.getByText("marzo 2031")).toBeInTheDocument();
    expect(dia(12)).toHaveAccessibleName("12 de marzo: 1 pendiente(s), 2 confirmada(s)");
    expect(dia(12).querySelector('[data-tipo="pendientes"]')).toHaveTextContent("1");
    expect(dia(12).querySelector('[data-tipo="confirmadas"]')).toHaveTextContent("2");
  });

  it("las reservas rechazadas o canceladas no ocupan el día", () => {
    render(<CalendarioReservas reservas={reservas} />);
    expect(dia(20)).toHaveAccessibleName("20 de marzo: sin reservas");
    expect(dia(21)).toHaveAccessibleName("21 de marzo: sin reservas");
  });

  it("al elegir un día lista sus reservas, y volver a pulsarlo lo cierra", async () => {
    render(<CalendarioReservas reservas={reservas} />);
    await userEvent.click(dia(12));
    const detalle = screen.getByRole("region", { name: "Reservas del 2031-03-12" });
    expect(within(detalle).getByText("Turista 1")).toBeInTheDocument();
    expect(within(detalle).getByText(/Paquete Ruta del río/)).toBeInTheDocument();
    expect(within(detalle).getByText("Pendiente")).toBeInTheDocument();
    expect(within(detalle).getByText(/desde la vista de lista/)).toBeInTheDocument();
    await userEvent.click(dia(12));
    expect(screen.queryByRole("region")).not.toBeInTheDocument();
  });

  it("un día sin reservas lo dice", async () => {
    render(<CalendarioReservas reservas={reservas} />);
    await userEvent.click(dia(15));
    expect(screen.getByText("No hay reservas ese día.")).toBeInTheDocument();
  });

  it("navega a otros meses y muestra sus reservas", async () => {
    render(<CalendarioReservas reservas={reservas} />);
    await userEvent.click(screen.getByRole("button", { name: "Mes siguiente" }));
    expect(screen.getByText("abril 2031")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /^2 de abril: 1 pendiente/ })).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "Mes anterior" }));
    expect(screen.getByText("marzo 2031")).toBeInTheDocument();
  });

  it("sin reservas futuras abre en el mes actual", () => {
    render(<CalendarioReservas reservas={[]} />);
    expect(screen.getByText("marzo 2031")).toBeInTheDocument();
  });
});

describe("ReservasRecibidas: lista o calendario", () => {
  beforeEach(() => { vi.useFakeTimers({ toFake: ["Date"] }); vi.setSystemTime(new Date("2031-03-10T12:00:00")); });
  afterEach(() => vi.useRealTimers());

  it("alterna entre la lista y el calendario", async () => {
    render(<ReservasRecibidas reservas={reservas} cargando={false} accionando={null} onAccion={vi.fn()} />);
    expect(screen.getByText("Turista 1")).toBeVisible();
    expect(screen.queryByLabelText("Calendario de reservas recibidas")).not.toBeInTheDocument();

    await userEvent.click(screen.getByRole("button", { name: /Calendario/ }));
    expect(screen.getByLabelText("Calendario de reservas recibidas")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Calendario/ })).toHaveAttribute("aria-pressed", "true");

    await userEvent.click(screen.getByRole("button", { name: /Lista/ }));
    expect(screen.queryByLabelText("Calendario de reservas recibidas")).not.toBeInTheDocument();
  });
});
