import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import ModalCalificar from "./ModalCalificar";

vi.mock("../api/client", () => ({ api: { calificarReserva: vi.fn() } }));
import { api } from "../api/client";

const reserva = { id: 12, fecha_servicio: "2026-01-05", sitio: { nombre: "Cascada La Diabala" } };

describe("ModalCalificar", () => {
  beforeEach(() => { api.calificarReserva.mockReset(); });

  it("exige elegir estrellas antes de enviar", async () => {
    render(<ModalCalificar reserva={reserva} onCerrar={() => {}} onGuardado={() => {}} />);
    await userEvent.click(screen.getByRole("button", { name: "Enviar calificación" }));
    expect(screen.getByText("Elige de 1 a 5 estrellas.")).toBeInTheDocument();
    expect(api.calificarReserva).not.toHaveBeenCalled();
  });

  it("envía calificación y comentario y avisa al guardar", async () => {
    const guardada = { id: 1, calificacion: 5 };
    api.calificarReserva.mockResolvedValue(guardada);
    const onGuardado = vi.fn();
    render(<ModalCalificar reserva={reserva} onCerrar={() => {}} onGuardado={onGuardado} />);

    await userEvent.click(screen.getByRole("radio", { name: "5 estrellas" }));
    expect(screen.getByText("Excelente")).toBeInTheDocument();
    await userEvent.type(screen.getByPlaceholderText(/Cuéntanos cómo te fue/), "Muy bonito");
    await userEvent.click(screen.getByRole("button", { name: "Enviar calificación" }));

    expect(api.calificarReserva).toHaveBeenCalledWith(12, { calificacion: 5, comentario: "Muy bonito" });
    expect(onGuardado).toHaveBeenCalledWith(guardada);
  });

  it("muestra el error del servidor sin cerrar el modal", async () => {
    api.calificarReserva.mockImplementation(() => Promise.reject(new Error("Ya calificaste esta reserva.")));
    const onGuardado = vi.fn();
    render(<ModalCalificar reserva={reserva} onCerrar={() => {}} onGuardado={onGuardado} />);
    await userEvent.click(screen.getByRole("radio", { name: "3 estrellas" }));
    await userEvent.click(screen.getByRole("button", { name: "Enviar calificación" }));
    expect(await screen.findByText("Ya calificaste esta reserva.")).toBeInTheDocument();
    expect(onGuardado).not.toHaveBeenCalled();
  });
});
