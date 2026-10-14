import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import PoliticaCancelacion from "./PoliticaCancelacion";
import SelectorPolitica from "./prestador/SelectorPolitica";
import MisReservas from "../pages/MisReservas";
import { diasHasta, seriaTardia, textoDias } from "../utils/politicas";

vi.mock("../context/auth", () => ({ useAuth: () => ({ usuario: { id: 1, nombre: "Ana", rol: "turista" } }) }));
vi.mock("../api/client", () => ({
  urlImagen: (x) => x,
  api: { configuracion: vi.fn(), misReservas: vi.fn(), cancelarReserva: vi.fn() },
}));
import { api } from "../api/client";

const PLAZOS = { flexible: 1, moderada: 3, estricta: 7 };
const enDias = (n) => new Date(Date.now() + n * 864e5).toLocaleDateString("en-CA");

describe("utilidades de política", () => {
  it("diasHasta cuenta días calendario sin importar la hora", () => {
    const hoy = new Date(2031, 2, 10, 23, 59);
    expect(diasHasta("2031-03-10", hoy)).toBe(0);
    expect(diasHasta("2031-03-11", hoy)).toBe(1);
    expect(diasHasta("2031-03-17", hoy)).toBe(7);
    expect(diasHasta("2031-04-01", hoy)).toBe(22);
  });

  it("seriaTardia compara contra el plazo que da el servidor", () => {
    expect(seriaTardia(PLAZOS, "moderada", enDias(2))).toBe(true);
    expect(seriaTardia(PLAZOS, "moderada", enDias(3))).toBe(false);
    expect(seriaTardia(PLAZOS, "flexible", enDias(1))).toBe(false);
    expect(seriaTardia(null, "estricta", enDias(1))).toBe(false); // sin datos del servidor no se asume nada
    expect(textoDias(1)).toBe("1 día");
    expect(textoDias(7)).toBe("7 días");
  });
});

describe("PoliticaCancelacion", () => {
  beforeEach(() => { api.configuracion.mockReset(); });

  it("explica el plazo con los días que entrega el servidor", async () => {
    api.configuracion.mockResolvedValue({ comision_pct: 10, politicas_cancelacion: PLAZOS });
    render(<PoliticaCancelacion politica="moderada" />);
    expect(await screen.findByText(/Gratis hasta 3 días antes del servicio/)).toBeInTheDocument();
    expect(screen.getByText(/Cancelación moderada\./)).toBeInTheDocument();
  });

  it("si no pudo consultar muestra el nombre sin inventar días", async () => {
    api.configuracion.mockRejectedValue(new Error("sin conexión"));
    render(<PoliticaCancelacion politica="estricta" />);
    expect(await screen.findByText(/Cancelación estricta\./)).toBeInTheDocument();
    expect(screen.queryByText(/Gratis hasta/)).not.toBeInTheDocument();
  });
});

describe("SelectorPolitica", () => {
  beforeEach(() => { api.configuracion.mockReset(); });

  it("ofrece las tres políticas con su plazo y avisa del cambio", async () => {
    api.configuracion.mockResolvedValue({ comision_pct: 10, politicas_cancelacion: PLAZOS });
    const onChange = vi.fn();
    render(<SelectorPolitica value="flexible" onChange={onChange} />);
    expect(await screen.findByRole("option", { name: "Estricta — gratis hasta 7 días antes" })).toBeInTheDocument();
    expect(screen.getAllByRole("option")).toHaveLength(3);
    await userEvent.selectOptions(screen.getByRole("combobox"), "moderada");
    expect(onChange).toHaveBeenCalledWith("moderada");
  });
});

describe("cancelar desde Mis reservas", () => {
  const reserva = (extra) => ({
    id: 7, estado: "confirmada", fecha_servicio: enDias(2), personas: 2, ninos: 0, total: "20000", politica_cancelacion: "moderada",
    sitio: { id: 1, nombre: "Cascada La Diabla", categoria: "Naturaleza", municipio: "Morelia" }, paquete: null, resena: null, ...extra,
  });
  let confirmar;

  beforeEach(() => {
    api.configuracion.mockReset().mockResolvedValue({ comision_pct: 10, politicas_cancelacion: PLAZOS });
    api.misReservas.mockReset();
    api.cancelarReserva.mockReset();
    confirmar = vi.spyOn(window, "confirm");
  });
  afterEach(() => confirmar.mockRestore());

  const abrir = async (r) => {
    api.misReservas.mockResolvedValue([r]);
    render(<MemoryRouter><MisReservas /></MemoryRouter>);
    await screen.findAllByText("Cascada La Diabla");
    await waitFor(() => expect(api.configuracion).toHaveBeenCalled());
  };

  it("avisa antes de cancelar con menos antelación que la política y registra que fue tardía", async () => {
    confirmar.mockReturnValue(true);
    api.cancelarReserva.mockResolvedValue({ estado: "cancelada", cancelacion_tardia: true });
    await abrir(reserva());
    await waitFor(() => expect(screen.getByRole("button", { name: /Cancelar reserva/ })).toBeEnabled());
    await new Promise((r) => setTimeout(r, 0)); // la configuración termina de llegar
    await userEvent.click(screen.getByRole("button", { name: /Cancelar reserva/ }));

    expect(confirmar).toHaveBeenCalledWith(expect.stringContaining("se registrará como cancelación tardía"));
    expect(confirmar).toHaveBeenCalledWith(expect.stringContaining("pide 3 días de antelación"));
    expect(await screen.findByText(/Se registró como cancelación tardía/)).toBeInTheDocument();
  });

  it("dentro del plazo no menciona cancelación tardía", async () => {
    confirmar.mockReturnValue(false);
    await abrir(reserva({ fecha_servicio: enDias(5) }));
    await new Promise((r) => setTimeout(r, 0));
    await userEvent.click(screen.getByRole("button", { name: /Cancelar reserva/ }));
    expect(confirmar).toHaveBeenCalledWith(expect.not.stringContaining("tardía"));
    expect(api.cancelarReserva).not.toHaveBeenCalled(); // el turista se arrepintió
  });

  it("una solicitud pendiente nunca se advierte como tardía", async () => {
    confirmar.mockReturnValue(false);
    await abrir(reserva({ estado: "pendiente", politica_cancelacion: "estricta" }));
    await new Promise((r) => setTimeout(r, 0));
    await userEvent.click(screen.getByRole("button", { name: /Cancelar reserva/ }));
    expect(confirmar).toHaveBeenCalledWith(expect.not.stringContaining("tardía"));
    const tarjeta = screen.getAllByText("Cascada La Diabla")[0].closest("article") || document.body;
    expect(within(tarjeta).queryByText(/cancelación tardía/)).not.toBeInTheDocument();
  });
});
