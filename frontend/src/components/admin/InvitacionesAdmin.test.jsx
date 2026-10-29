import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import InvitacionesAdmin from "./InvitacionesAdmin";

vi.mock("../../api/client", () => ({ api: { invitacionesAdmin: vi.fn(), invitarNegocioAdmin: vi.fn() } }));
import { api } from "../../api/client";

const invitacion = (extra = {}) => ({ id: 1, correo: "finca@ejemplo.com", nombre_negocio: "Finca El Paraíso", enviada_en: "2031-05-02T15:00:00Z", registrado: false, como_negocio: false, ...extra });

describe("InvitacionesAdmin", () => {
  beforeEach(() => {
    api.invitacionesAdmin.mockReset().mockResolvedValue([invitacion(), invitacion({ id: 2, correo: "rio@ejemplo.com", nombre_negocio: null, registrado: true, como_negocio: true })]);
    api.invitarNegocioAdmin.mockReset();
  });

  it("muestra las invitaciones con su estado y cuántas ya se registraron como negocio", async () => {
    render(<InvitacionesAdmin />);
    expect(await screen.findByText("Finca El Paraíso")).toBeInTheDocument();
    expect(screen.getByText("Sin registrarse")).toBeInTheDocument();
    expect(screen.getByText("Registrado como negocio")).toBeInTheDocument();
    expect(screen.getByText(/1 de 2 ya se registraron como negocio/)).toBeInTheDocument();
  });

  it("envía la invitación, limpia el formulario y recarga la lista", async () => {
    api.invitarNegocioAdmin.mockResolvedValue({ id: 3, correo: "nuevo@ejemplo.com" });
    render(<InvitacionesAdmin />);
    await screen.findByText("Finca El Paraíso");
    await userEvent.type(screen.getByLabelText("Correo del negocio"), "nuevo@ejemplo.com");
    await userEvent.type(screen.getByLabelText(/Nombre del negocio/), "Café La Loma");
    await userEvent.click(screen.getByRole("button", { name: /Enviar invitación/ }));
    expect(api.invitarNegocioAdmin).toHaveBeenCalledWith({ correo: "nuevo@ejemplo.com", nombre_negocio: "Café La Loma", mensaje: "" });
    expect(await screen.findByRole("status")).toHaveTextContent("Invitación enviada a nuevo@ejemplo.com.");
    expect(screen.getByLabelText("Correo del negocio")).toHaveValue("");
    expect(api.invitacionesAdmin).toHaveBeenCalledTimes(2);
  });

  it("muestra el motivo si el servidor no la envía", async () => {
    api.invitarNegocioAdmin.mockRejectedValue(new Error("Ese correo ya tiene una cuenta en PubliTours."));
    render(<InvitacionesAdmin />);
    await screen.findByText("Finca El Paraíso");
    await userEvent.type(screen.getByLabelText("Correo del negocio"), "ya@ejemplo.com");
    await userEvent.click(screen.getByRole("button", { name: /Enviar invitación/ }));
    expect(await screen.findByRole("alert")).toHaveTextContent("ya tiene una cuenta");
  });
});
