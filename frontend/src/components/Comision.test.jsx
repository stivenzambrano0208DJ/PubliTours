import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import Comision from "./Comision";
import Terminos from "../pages/Terminos";
import ConviertetePrestador from "../pages/ConviertetePrestador";

vi.mock("../api/client", () => ({ api: { configuracion: vi.fn() } }));
import { api } from "../api/client";

describe("Comision", () => {
  beforeEach(() => { api.configuracion.mockReset(); });

  it("muestra el porcentaje que entrega el servidor", async () => {
    api.configuracion.mockResolvedValue({ comision_pct: 12 });
    render(<p>Comisión de <Comision />.</p>);
    expect(await screen.findByText("Comisión de 12 %.")).toBeInTheDocument();
  });

  it("usa coma decimal", async () => {
    api.configuracion.mockResolvedValue({ comision_pct: 7.5 });
    render(<p>x <Comision />.</p>);
    expect(await screen.findByText("x 7,5 %.")).toBeInTheDocument();
  });

  it("si no se puede consultar no inventa un número", async () => {
    api.configuracion.mockRejectedValue(new Error("sin conexión"));
    render(<p>Comisión de <Comision />.</p>);
    await Promise.resolve();
    expect(screen.getByText("Comisión de un porcentaje.")).toBeInTheDocument();
  });

  it("los Términos explican que es una estimación que hoy no se cobra", async () => {
    api.configuracion.mockResolvedValue({ comision_pct: 10 });
    render(<MemoryRouter><Terminos /></MemoryRouter>);
    expect(await screen.findByText(/comisión de 10 % sobre las reservas aceptadas/)).toBeInTheDocument();
    expect(screen.getByText(/no se cobra/)).toBeInTheDocument();
  });

  it("la página para prestadores ya no dice que no hay comisiones y cuenta el modelo real", async () => {
    api.configuracion.mockResolvedValue({ comision_pct: 10 });
    render(<MemoryRouter><ConviertetePrestador /></MemoryRouter>);
    expect(screen.queryByText(/no cobra comisiones/)).not.toBeInTheDocument();
    expect((await screen.findAllByText(/comisión de 10 %/)).length).toBeGreaterThanOrEqual(1);
  });
});
