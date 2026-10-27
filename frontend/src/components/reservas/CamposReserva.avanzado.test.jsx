import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useState } from "react";
import CamposReserva from "./CamposReserva";
import { tieneTarifaAvanzada } from "../../utils/catalogo";

vi.mock("../../api/client", () => ({ api: { fechasBloqueadas: vi.fn(() => Promise.resolve([])), disponibilidadSitio: vi.fn(() => Promise.resolve({ dias: [] })), cotizarSitio: vi.fn() } }));
import { api } from "../../api/client";

function Contenedor({ sitio, inicial = { fecha: "2030-06-10", personas: 3, ninos: 0, nota: "" }, extra = {} }) {
  const [valores, setValores] = useState(inicial);
  return <CamposReserva sitio={sitio} valores={valores} onCambio={setValores} {...extra} />;
}
const conTarifas = { id: 5, precio: "100000", precio_nino: "60000", grupo_min_personas: 5, grupo_descuento_pct: 10 };

describe("tarifas avanzadas en el formulario de reserva", () => {
  beforeEach(() => { api.cotizarSitio.mockReset(); });

  it("detecta cuándo un servicio tiene tarifas distintas a precio × personas", () => {
    expect(tieneTarifaAvanzada({ precio: 1 })).toBe(false);
    expect(tieneTarifaAvanzada({ precio: 1, precio_nino: "0" })).toBe(true); // niños gratis también cuenta
    expect(tieneTarifaAvanzada({ precio: 1, grupo_min_personas: 4 })).toBe(true);
    expect(tieneTarifaAvanzada({ precio: 1, tiene_temporadas: true })).toBe(true);
    expect(tieneTarifaAvanzada({ precio: 1, tarifas: [{ id: 1 }] })).toBe(true);
  });

  it("muestra el campo de niños y el total que calcula el servidor, con su desglose", async () => {
    api.cotizarSitio.mockResolvedValue({
      total: 260000, adultos: 2, ninos: 1, precio_adulto: 100000, precio_nino: 60000, descuento: 0, descuento_pct: 0, temporada: null,
    });
    render(<Contenedor sitio={conTarifas} />);
    await userEvent.clear(screen.getByLabelText(/De ellas, niños/));
    await userEvent.type(screen.getByLabelText(/De ellas, niños/), "1");

    await waitFor(() => expect(api.cotizarSitio).toHaveBeenLastCalledWith(5, { fecha: "2030-06-10", personas: 3, ninos: 1 }));
    expect(await screen.findByText("$260.000 COP")).toBeInTheDocument();
    expect(screen.getByText(/2 adultos × \$100\.000 \+ 1 niño × \$60\.000/)).toBeInTheDocument();
  });

  it("explica la temporada y el descuento por grupo aplicados", async () => {
    api.cotizarSitio.mockResolvedValue({
      total: 576000, adultos: 2, ninos: 2, precio_adulto: 200000, precio_nino: 120000, descuento: 64000, descuento_pct: 10, temporada: "Diciembre",
    });
    render(<Contenedor sitio={conTarifas} inicial={{ fecha: "2030-12-20", personas: 4, ninos: 2, nota: "" }} />);
    expect(await screen.findByText("$576.000 COP")).toBeInTheDocument();
    expect(screen.getByText(/Tarifa «Diciembre»/)).toBeInTheDocument();
    expect(screen.getByText(/descuento por grupo 10 % \(−\$64\.000\)/)).toBeInTheDocument();
  });

  it("sin tarifas avanzadas no pide cotización y no muestra el campo de niños", () => {
    render(<Contenedor sitio={{ id: 6, precio: "50000" }} />);
    expect(screen.queryByLabelText(/De ellas, niños/)).not.toBeInTheDocument();
    expect(screen.getByText("$150.000 COP")).toBeInTheDocument(); // 3 × 50.000, cálculo local
    expect(api.cotizarSitio).not.toHaveBeenCalled();
  });

  it("un paquete cobra su precio por persona y no pregunta por niños", () => {
    render(<Contenedor sitio={{ ...conTarifas, id: 9 }} extra={{ cotizar: null }} />);
    expect(screen.queryByLabelText(/De ellas, niños/)).not.toBeInTheDocument();
    expect(api.cotizarSitio).not.toHaveBeenCalled();
  });

  it("el calendario se abre a pedido y elegir un día cambia la fecha", async () => {
    const disponibilidad = vi.fn(() => Promise.resolve({ dias: [{ fecha: "2030-06-15", estado: "libre" }, { fecha: "2030-06-16", estado: "completo" }] }));
    render(<Contenedor sitio={{ id: 6, precio: "50000" }} extra={{ cargarDisponibilidad: disponibilidad }} />);
    expect(disponibilidad).not.toHaveBeenCalled();
    await userEvent.click(screen.getByRole("button", { name: /Ver calendario de disponibilidad/ }));
    await waitFor(() => expect(disponibilidad).toHaveBeenCalledWith("2030-06"));
    await userEvent.click(await screen.findByRole("button", { name: /^15 de junio: libre/ }));
    expect(screen.getByLabelText(/Fecha del servicio/)).toHaveValue("2030-06-15");
    await userEvent.click(screen.getByRole("button", { name: /Ocultar calendario/ }));
    expect(screen.queryByLabelText("Calendario de disponibilidad")).not.toBeInTheDocument();
  });
});
