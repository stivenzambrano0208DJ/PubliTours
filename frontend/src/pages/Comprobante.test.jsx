import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Routes, Route } from "react-router-dom";
import Comprobante from "./Comprobante";
import VerificarReserva from "./VerificarReserva";

vi.mock("../api/client", () => ({ api: { obtenerReserva: vi.fn(), verificarReserva: vi.fn() } }));
import { api } from "../api/client";

const reserva = {
  id: 4, codigo: "PT-K7M2QX", estado: "confirmada", fecha_servicio: "2031-03-12", personas: 3, ninos: 1, total: "260000", nota: "Llegamos tarde",
  sitio: { nombre: "Cascada La Diabla" }, paquete: null, turista: { nombre: "Ana Pérez" },
  prestador: { nombre_negocio: "Finca El Paraíso", municipio: "Morelia", direccion: "Km 4", telefono: "3001234567" },
};
const montar = (ruta, elemento, path) => render(<MemoryRouter initialEntries={[ruta]}><Routes><Route path={path} element={elemento} /></Routes></MemoryRouter>);

describe("Comprobante", () => {
  beforeEach(() => { api.obtenerReserva.mockReset(); api.verificarReserva.mockReset(); });

  it("muestra el código, los datos de la reserva y del prestador, y el QR", async () => {
    api.obtenerReserva.mockResolvedValue(reserva);
    const { container } = montar("/comprobante/4", <Comprobante />, "/comprobante/:id");
    expect(await screen.findByTestId("codigo")).toHaveTextContent("PT-K7M2QX");
    expect(api.obtenerReserva).toHaveBeenCalledWith("4");
    expect(screen.getByText("Cascada La Diabla")).toBeInTheDocument();
    expect(screen.getByText("Ana Pérez")).toBeInTheDocument();
    expect(screen.getByText("3 (1 niño)")).toBeInTheDocument();
    expect(screen.getByText("$260.000 COP")).toBeInTheDocument();
    expect(screen.getByText("Finca El Paraíso")).toBeInTheDocument();
    expect(screen.getByText(/Presenta este código o el QR/)).toBeInTheDocument();
    expect(container.querySelector("svg")).toBeInTheDocument(); // QR
  });

  it("el botón imprime la página", async () => {
    api.obtenerReserva.mockResolvedValue(reserva);
    window.print = vi.fn();
    montar("/comprobante/4", <Comprobante />, "/comprobante/:id");
    await userEvent.click(await screen.findByRole("button", { name: /Imprimir o guardar PDF/ }));
    expect(window.print).toHaveBeenCalled();
  });

  it("una reserva pendiente avisa que aún no es válida", async () => {
    api.obtenerReserva.mockResolvedValue({ ...reserva, estado: "pendiente" });
    montar("/comprobante/4", <Comprobante />, "/comprobante/:id");
    expect(await screen.findByText("Pendiente de confirmación")).toBeInTheDocument();
    expect(screen.getByText(/solo es válido cuando la reserva está confirmada/)).toBeInTheDocument();
  });

  it("un comprobante ajeno o inexistente muestra el error", async () => {
    api.obtenerReserva.mockRejectedValue(new Error("Reserva no encontrada."));
    montar("/comprobante/99", <Comprobante />, "/comprobante/:id");
    expect(await screen.findByText("Reserva no encontrada.")).toBeInTheDocument();
  });
});

describe("VerificarReserva (QR público)", () => {
  beforeEach(() => { api.verificarReserva.mockReset(); });

  it("un código de reserva confirmada se muestra como válido, con datos mínimos", async () => {
    api.verificarReserva.mockResolvedValue({ codigo: "PT-K7M2QX", estado: "confirmada", fecha_servicio: "2031-03-12", personas: 3, servicio: "Cascada La Diabla", titular: "Ana P." });
    montar("/verificar/PT-K7M2QX", <VerificarReserva />, "/verificar/:codigo");
    expect(await screen.findByRole("heading", { name: "Reserva válida" })).toBeInTheDocument();
    expect(screen.getByText("Ana P.")).toBeInTheDocument();
    expect(api.verificarReserva).toHaveBeenCalledWith("PT-K7M2QX");
  });

  it("una reserva pendiente no se presenta como válida", async () => {
    api.verificarReserva.mockResolvedValue({ codigo: "PT-AAAAAA", estado: "pendiente", fecha_servicio: "2031-03-12", personas: 1, servicio: "X", titular: "Luis G." });
    montar("/verificar/PT-AAAAAA", <VerificarReserva />, "/verificar/:codigo");
    expect(await screen.findByRole("heading", { name: "Reserva pendiente" })).toBeInTheDocument();
    expect(screen.getByText(/Solo las reservas confirmadas/)).toBeInTheDocument();
  });

  it("un código inexistente muestra que no es válido", async () => {
    api.verificarReserva.mockRejectedValue(new Error("No existe una reserva con ese código."));
    montar("/verificar/PT-ZZZZZZ", <VerificarReserva />, "/verificar/:codigo");
    expect(await screen.findByRole("heading", { name: "Código no válido" })).toBeInTheDocument();
  });
});
