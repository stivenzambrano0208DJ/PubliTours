import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import CalendarioDisponibilidad from "./CalendarioDisponibilidad";

const mes = (a, m) => `${a}-${String(m).padStart(2, "0")}`;

// Un mes fijo en el futuro lejano para que ningún día cuente como "pasado" por la fecha real
const ANIO = 2031;
const diasDe = (m, estados) => Array.from({ length: new Date(ANIO, m, 0).getDate() }, (_, i) => {
  const fecha = `${mes(ANIO, m)}-${String(i + 1).padStart(2, "0")}`;
  return { fecha, estado: "libre", ...(estados[i + 1] || {}) };
});

describe("CalendarioDisponibilidad", () => {
  beforeEach(() => { vi.useFakeTimers({ toFake: ["Date"] }); vi.setSystemTime(new Date("2031-03-10T12:00:00")); });
  afterEach(() => vi.useRealTimers());

  const montar = (props = {}) => {
    const cargar = vi.fn((m) => Promise.resolve({ capacidad: 8, dias: diasDe(Number(m.slice(5)), { 12: { estado: "pocos", cupos_libres: 2 }, 13: { estado: "completo", cupos_libres: 0 }, 14: { estado: "bloqueado", motivo: "Feriado" } }) }));
    const onElegir = vi.fn();
    render(<CalendarioDisponibilidad cargar={cargar} seleccionada="2031-03-20" onElegir={onElegir} {...props} />);
    return { cargar, onElegir };
  };
  const celda = (dia) => screen.getByRole("button", { name: new RegExp(`^${dia} de marzo`) });

  it("pide el mes de la fecha seleccionada y muestra el estado de cada día", async () => {
    const { cargar } = montar();
    expect(cargar).toHaveBeenCalledWith("2031-03");
    await waitFor(() => expect(celda(12)).toHaveAttribute("data-estado", "pocos"));
    expect(celda(13)).toHaveAttribute("data-estado", "completo");
    expect(celda(14)).toHaveAttribute("data-estado", "bloqueado");
    expect(celda(20)).toHaveAttribute("data-estado", "libre");
    expect(celda(12)).toHaveAccessibleName(/2 cupos/);
  });

  it("solo se pueden elegir los días libres o con pocos cupos", async () => {
    const { onElegir } = montar();
    await waitFor(() => expect(celda(12)).toBeEnabled());
    await userEvent.click(celda(12));
    expect(onElegir).toHaveBeenCalledWith("2031-03-12");
    expect(celda(13)).toBeDisabled(); // completo
    expect(celda(14)).toBeDisabled(); // bloqueado
    await userEvent.click(celda(13));
    expect(onElegir).toHaveBeenCalledTimes(1);
  });

  it("marca el día seleccionado", async () => {
    montar();
    await waitFor(() => expect(celda(20)).toHaveAttribute("aria-pressed", "true"));
  });

  it("navega entre meses y no deja ir antes del mes actual", async () => {
    const { cargar } = montar({ seleccionada: "2031-03-20" });
    const anterior = screen.getByRole("button", { name: "Mes anterior" });
    expect(anterior).toBeDisabled(); // marzo de 2031 es el mes actual simulado
    await userEvent.click(screen.getByRole("button", { name: "Mes siguiente" }));
    expect(cargar).toHaveBeenLastCalledWith("2031-04");
    expect(await screen.findByText("abril 2031")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Mes anterior" })).toBeEnabled();
  });

  it("muestra un aviso si no se puede cargar la disponibilidad", async () => {
    montar({ cargar: vi.fn(() => Promise.reject(new Error("falló"))) });
    expect(await screen.findByText(/No pudimos cargar la disponibilidad/)).toBeInTheDocument();
  });
});
