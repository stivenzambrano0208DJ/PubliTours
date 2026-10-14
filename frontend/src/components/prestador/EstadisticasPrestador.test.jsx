import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor, within, fireEvent } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import EstadisticasPrestador from "./EstadisticasPrestador";

vi.mock("../../api/client", () => ({ api: { estadisticasPrestador: vi.fn(), csvEstadisticasPrestador: vi.fn() } }));
import { api } from "../../api/client";

const datos = {
  periodo: { desde: "2031-01-01", hasta: "2031-02-28" },
  totales: {
    solicitudes: 6, confirmadas: 3, ingresos: 290000, comision: 29000, neto: 261000, comision_pct: 10, personas: 6, tasa_no_asistencia: null, cancelaciones_tardias: 0, ticket_promedio: 96667, tasa_aceptacion: 75,
    por_estado: { pendiente: 1, confirmada: 2, completada: 1, rechazada: 1, cancelada: 1, no_asistio: 0 },
  },
  por_mes: [
    { mes: "2031-01", solicitudes: 2, confirmadas: 2, ingresos: 250000 },
    { mes: "2031-02", solicitudes: 4, confirmadas: 1, ingresos: 40000 },
  ],
  por_servicio: [
    { nombre: "Río", tipo: "servicio", reservas: 2, personas: 5, ingresos: 250000 },
    { nombre: "Ruta del café", tipo: "paquete", reservas: 1, personas: 1, ingresos: 40000 },
  ],
};

describe("EstadisticasPrestador", () => {
  beforeEach(() => { api.estadisticasPrestador.mockReset(); api.csvEstadisticasPrestador.mockReset(); });

  it("pide el periodo por defecto y muestra los números del servidor", async () => {
    api.estadisticasPrestador.mockResolvedValue(datos);
    render(<EstadisticasPrestador />);
    expect(await screen.findByText("$290.000")).toBeInTheDocument();
    const { desde, hasta } = api.estadisticasPrestador.mock.calls[0][0];
    expect(desde).toMatch(/^\d{4}-\d{2}-01$/);
    expect(hasta).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect(screen.getByText("75 %")).toBeInTheDocument();
    expect(screen.getByText("$29.000")).toBeInTheDocument(); // comisión estimada
    expect(screen.getByText("10 % · aún no se cobra")).toBeInTheDocument();
    expect(screen.getByText("$261.000")).toBeInTheDocument(); // neto
    expect(screen.getByText("$96.667")).toBeInTheDocument();
    expect(screen.getByText("1 pendiente(s)")).toBeInTheDocument();
  });

  it("dibuja las gráficas por mes con sus valores", async () => {
    api.estadisticasPrestador.mockResolvedValue(datos);
    render(<EstadisticasPrestador />);
    const solicitudes = await screen.findByRole("img", { name: /^Solicitudes por mes: ene 31 2, feb 31 4$/ });
    expect(solicitudes).toBeInTheDocument();
    expect(screen.getByRole("img", { name: /^Ingresos por mes: ene 31 \$250 mil, feb 31 \$40 mil$/ })).toBeInTheDocument();
  });

  it("lista qué se vende más, marcando los paquetes", async () => {
    api.estadisticasPrestador.mockResolvedValue(datos);
    render(<EstadisticasPrestador />);
    const tabla = await screen.findByRole("table");
    expect(within(tabla).getByText("Río")).toBeInTheDocument();
    expect(within(tabla).getByText("Paquete")).toBeInTheDocument();
    expect(within(tabla).getByText("$40.000")).toBeInTheDocument();
  });

  it("cambiar el periodo vuelve a consultar con las nuevas fechas", async () => {
    api.estadisticasPrestador.mockResolvedValue(datos);
    render(<EstadisticasPrestador />);
    await screen.findByText("$290.000");
    fireEvent.change(screen.getByLabelText("Desde"), { target: { value: "2031-01-15" } });
    await waitFor(() => expect(api.estadisticasPrestador).toHaveBeenLastCalledWith(expect.objectContaining({ desde: "2031-01-15" })));
  });

  it("sin reservas aceptadas no inventa porcentajes ni gráficas", async () => {
    api.estadisticasPrestador.mockResolvedValue({
      ...datos, por_mes: [], por_servicio: [],
      totales: { solicitudes: 0, confirmadas: 0, ingresos: 0, comision: 0, neto: 0, comision_pct: 10, personas: 0, ticket_promedio: null, tasa_aceptacion: null, por_estado: { pendiente: 0, confirmada: 0, completada: 0, rechazada: 0, cancelada: 0, no_asistio: 0 }, tasa_no_asistencia: null, cancelaciones_tardias: 0 },
    });
    render(<EstadisticasPrestador />);
    expect(await screen.findByText("Aún no hay reservas aceptadas en este periodo.")).toBeInTheDocument();
    expect(screen.getAllByText("—")).toHaveLength(3); // ticket promedio, tasa de aceptación y tasa de no asistencia
    expect(screen.getAllByText("Sin datos en este periodo.")).toHaveLength(2);
  });

  it("muestra el error del servidor y no permite descargar", async () => {
    api.estadisticasPrestador.mockRejectedValue(new Error("El periodo no puede superar 2 años."));
    render(<EstadisticasPrestador />);
    expect(await screen.findByRole("alert")).toHaveTextContent("2 años");
    expect(screen.getByRole("button", { name: /Descargar CSV/ })).toBeDisabled();
  });

  it("descarga el CSV del periodo elegido", async () => {
    api.estadisticasPrestador.mockResolvedValue(datos);
    api.csvEstadisticasPrestador.mockResolvedValue(new Blob(["a;b"], { type: "text/csv" }));
    URL.createObjectURL = vi.fn(() => "blob:csv");
    URL.revokeObjectURL = vi.fn();
    const clic = vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(() => {});
    render(<EstadisticasPrestador />);
    await screen.findByText("$290.000");
    await userEvent.click(screen.getByRole("button", { name: /Descargar CSV/ }));
    await waitFor(() => expect(clic).toHaveBeenCalled());
    expect(api.csvEstadisticasPrestador).toHaveBeenCalledWith(expect.objectContaining({ desde: expect.any(String), hasta: expect.any(String) }));
    clic.mockRestore();
  });
});
