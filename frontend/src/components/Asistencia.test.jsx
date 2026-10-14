import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import ReservasRecibidas from "./prestador/ReservasRecibidas";
import EstadisticasPrestador from "./prestador/EstadisticasPrestador";
import MisReservas from "../pages/MisReservas";
import { sumarDias } from "../utils/fechas";

vi.mock("../context/auth", () => ({ useAuth: () => ({ usuario: { id: 1, nombre: "Ana", rol: "turista" } }) }));
vi.mock("../api/client", () => ({
  urlImagen: (x) => x,
  api: { configuracion: vi.fn(), misReservas: vi.fn(), estadisticasPrestador: vi.fn() },
}));
import { api } from "../api/client";

const enDias = (n) => new Date(Date.now() + n * 864e5).toLocaleDateString("en-CA");
const CONFIG = { comision_pct: 10, politicas_cancelacion: { flexible: 1, moderada: 3, estricta: 7 }, dias_gracia_asistencia: 3 };

describe("sumarDias", () => {
  it("suma días sin desfases de mes ni de año", () => {
    expect(sumarDias("2031-03-12", 3)).toBe("2031-03-15");
    expect(sumarDias("2031-01-30", 3)).toBe("2031-02-02");
    expect(sumarDias("2031-12-30", 3)).toBe("2032-01-02");
  });
});

describe("el prestador registra la asistencia", () => {
  const reserva = (extra) => ({
    id: 5, fecha_servicio: enDias(-1), estado: "confirmada", personas: 2, total: "40000", turista: { nombre: "Luis Gómez" },
    sitio: { nombre: "Karting" }, paquete: null, ...extra,
  });
  let confirmar;
  beforeEach(() => {
    api.configuracion.mockReset().mockResolvedValue(CONFIG);
    confirmar = vi.spyOn(window, "confirm");
  });
  afterEach(() => confirmar.mockRestore());

  const montar = (r, onAccion = vi.fn()) => {
    render(<ReservasRecibidas reservas={[r]} cargando={false} accionando={null} onAccion={onAccion} />);
    return onAccion;
  };

  it("una reserva confirmada cuyo servicio ya pasó pide registrar si asistió, y avisa cuándo se cierra sola", async () => {
    montar(reserva());
    expect(screen.getByText("¿Asistió?")).toBeInTheDocument();
    expect(await screen.findByText(`Si no lo registras, se cierra sola el ${sumarDias(enDias(-1), 3)}.`)).toBeInTheDocument();
  });

  it("«Asistió» se registra de inmediato", async () => {
    const onAccion = montar(reserva());
    await userEvent.click(screen.getByRole("button", { name: "Asistió" }));
    expect(onAccion).toHaveBeenCalledWith(5, "asistio");
    expect(confirmar).not.toHaveBeenCalled();
  });

  it("«No asistió» pide confirmación porque es definitivo y no se registra si se arrepiente", async () => {
    confirmar.mockReturnValueOnce(false);
    const onAccion = montar(reserva());
    await userEvent.click(screen.getByRole("button", { name: "No asistió" }));
    expect(confirmar).toHaveBeenCalledWith(expect.stringContaining("Luis Gómez"));
    expect(onAccion).not.toHaveBeenCalled();

    confirmar.mockReturnValueOnce(true);
    await userEvent.click(screen.getByRole("button", { name: "No asistió" }));
    expect(onAccion).toHaveBeenCalledWith(5, "no_asistio");
  });

  it("antes del día del servicio no hay botones de asistencia", () => {
    montar(reserva({ fecha_servicio: enDias(2) }));
    expect(screen.queryByText("¿Asistió?")).not.toBeInTheDocument();
  });

  it("una solicitud pendiente tampoco los muestra", () => {
    montar(reserva({ estado: "pendiente" }));
    expect(screen.queryByText("¿Asistió?")).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Confirmar" })).toBeInTheDocument();
  });

  it("muestra el resultado ya registrado y si fue un cierre automático", () => {
    montar(reserva({ estado: "no_asistio" }));
    expect(screen.getByText("No asistió", { selector: "span" })).toBeInTheDocument();
    expect(screen.queryByText("¿Asistió?")).not.toBeInTheDocument();
  });

  it("distingue la completada que registró el prestador de la que se cerró sola", () => {
    const { unmount } = render(<ReservasRecibidas reservas={[reserva({ estado: "completada" })]} cargando={false} accionando={null} onAccion={vi.fn()} />);
    expect(screen.getByText("Completada")).toBeInTheDocument();
    unmount();
    render(<ReservasRecibidas reservas={[reserva({ estado: "completada", cierre_automatico: true })]} cargando={false} accionando={null} onAccion={vi.fn()} />);
    expect(screen.getByText("Completada (cierre automático)")).toBeInTheDocument();
  });
});

describe("el turista ve en qué quedó su asistencia", () => {
  const reserva = (extra) => ({
    id: 9, estado: "confirmada", fecha_servicio: enDias(-1), personas: 2, ninos: 0, total: "20000", politica_cancelacion: "flexible",
    sitio: { id: 1, nombre: "Cascada La Diabla", categoria: "Naturaleza", municipio: "Morelia" }, paquete: null, resena: null, ...extra,
  });
  beforeEach(() => { api.configuracion.mockReset().mockResolvedValue(CONFIG); api.misReservas.mockReset(); });

  const abrir = async (r) => {
    api.misReservas.mockResolvedValue([r]);
    render(<MemoryRouter><MisReservas /></MemoryRouter>);
    await screen.findAllByText("Cascada La Diabla");
  };

  it("confirmada y ya pasada: espera a que el prestador registre la asistencia y todavía no deja calificar", async () => {
    await abrir(reserva());
    expect(await screen.findByText(/El prestador está registrando tu asistencia/)).toBeInTheDocument();
    expect(await screen.findByText(new RegExp(`a más tardar, el ${sumarDias(enDias(-1), 3)}`))).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /Calificar experiencia/ })).not.toBeInTheDocument();
  });

  it("completada: ya puede calificar", async () => {
    await abrir(reserva({ estado: "completada" }));
    expect(screen.getByRole("button", { name: /Calificar experiencia/ })).toBeInTheDocument();
    expect(screen.queryByText(/está registrando tu asistencia/)).not.toBeInTheDocument();
  });

  it("no asistió: lo explica, sin calificar ni cancelar, y se puede filtrar", async () => {
    await abrir(reserva({ estado: "no_asistio" }));
    expect(screen.getByText(/registró que no asististe/)).toBeInTheDocument();
    expect(screen.getAllByText("NO ASISTIÓ").length).toBeGreaterThanOrEqual(1);
    expect(screen.queryByRole("button", { name: /Calificar experiencia/ })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /Cancelar reserva/ })).not.toBeInTheDocument();
    expect(screen.getAllByText("No asistidas").length).toBeGreaterThanOrEqual(1);
  });
});

describe("la tasa de no asistencia en las estadísticas", () => {
  const base = (totales) => ({
    periodo: { desde: "2031-01-01", hasta: "2031-02-28" },
    totales: {
      solicitudes: 4, confirmadas: 2, ingresos: 200000, comision: 20000, neto: 180000, comision_pct: 10, personas: 6,
      ticket_promedio: 100000, tasa_aceptacion: 75, cancelaciones_tardias: 0,
      por_estado: { pendiente: 0, confirmada: 0, completada: 2, rechazada: 1, cancelada: 0, no_asistio: 1 }, ...totales,
    },
    por_mes: [], por_servicio: [],
  });
  beforeEach(() => { api.estadisticasPrestador.mockReset(); });

  it("muestra el porcentaje de las reservas ya cerradas", async () => {
    api.estadisticasPrestador.mockResolvedValue(base({ tasa_no_asistencia: 33 }));
    render(<EstadisticasPrestador />);
    expect(await screen.findByText("33 %")).toBeInTheDocument();
    expect(screen.getByText("1 de las ya cerradas")).toBeInTheDocument();
  });

  it("sin reservas cerradas no inventa un porcentaje", async () => {
    api.estadisticasPrestador.mockResolvedValue(base({ tasa_no_asistencia: null, por_estado: { pendiente: 1, confirmada: 1, completada: 0, rechazada: 0, cancelada: 0, no_asistio: 0 } }));
    render(<EstadisticasPrestador />);
    await waitFor(() => expect(screen.getByText("No asistencia")).toBeInTheDocument());
    expect(screen.getByText("0 de las ya cerradas")).toBeInTheDocument();
  });
});
