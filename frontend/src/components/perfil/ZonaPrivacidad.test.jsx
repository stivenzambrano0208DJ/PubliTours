import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import ZonaPrivacidad from "./ZonaPrivacidad";

const logout = vi.fn();
const navigate = vi.fn();
vi.mock("../../context/auth", () => ({ useAuth: () => ({ logout }) }));
vi.mock("react-router-dom", async (original) => ({ ...(await original()), useNavigate: () => navigate }));
vi.mock("../../api/client", () => ({ api: { misDatos: vi.fn(), eliminarCuenta: vi.fn() } }));
import { api } from "../../api/client";

const montar = () => render(<MemoryRouter><ZonaPrivacidad /></MemoryRouter>);

describe("ZonaPrivacidad", () => {
  beforeEach(() => { api.misDatos.mockReset(); api.eliminarCuenta.mockReset(); logout.mockReset(); navigate.mockReset(); });

  it("descargar mis datos pide los datos y los entrega como archivo JSON", async () => {
    api.misDatos.mockResolvedValue({ cuenta: { nombre: "Ana" } });
    URL.createObjectURL = vi.fn(() => "blob:datos");
    URL.revokeObjectURL = vi.fn();
    const clic = vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(() => {});

    montar();
    await userEvent.click(screen.getByRole("button", { name: "Descargar mis datos" }));
    await waitFor(() => expect(clic).toHaveBeenCalled());
    expect(api.misDatos).toHaveBeenCalled();
    expect(URL.createObjectURL.mock.calls[0][0].type).toBe("application/json");
    clic.mockRestore();
  });

  it("muestra el error si no se pueden descargar", async () => {
    api.misDatos.mockRejectedValue(new Error("Sin conexión"));
    montar();
    await userEvent.click(screen.getByRole("button", { name: "Descargar mis datos" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("Sin conexión");
  });

  it("eliminar la cuenta pide la contraseña, cierra la sesión y vuelve al inicio", async () => {
    api.eliminarCuenta.mockResolvedValue({ mensaje: "ok" });
    montar();
    await userEvent.click(screen.getByRole("button", { name: "Eliminar mi cuenta" }));
    const confirmar = screen.getByRole("button", { name: /Sí, eliminar definitivamente/ });
    expect(confirmar).toBeDisabled(); // sin contraseña no se puede confirmar
    await userEvent.type(screen.getByLabelText(/contraseña para confirmar/), "clave12345");
    await userEvent.click(confirmar);

    await waitFor(() => expect(api.eliminarCuenta).toHaveBeenCalledWith("clave12345"));
    expect(logout).toHaveBeenCalled();
    expect(navigate).toHaveBeenCalledWith("/", { replace: true });
  });

  it("si el servidor la rechaza (reservas pendientes) no cierra la sesión y muestra el motivo", async () => {
    api.eliminarCuenta.mockRejectedValue(new Error("Tienes 1 reserva(s) pendiente(s) o próxima(s)."));
    montar();
    await userEvent.click(screen.getByRole("button", { name: "Eliminar mi cuenta" }));
    await userEvent.type(screen.getByLabelText(/contraseña para confirmar/), "clave12345");
    await userEvent.click(screen.getByRole("button", { name: /Sí, eliminar definitivamente/ }));

    expect(await screen.findByRole("alert")).toHaveTextContent("reserva(s) pendiente(s)");
    expect(logout).not.toHaveBeenCalled();
    expect(navigate).not.toHaveBeenCalled();
  });

  it("cancelar vuelve a ocultar la confirmación", async () => {
    montar();
    await userEvent.click(screen.getByRole("button", { name: "Eliminar mi cuenta" }));
    await userEvent.click(screen.getByRole("button", { name: "Cancelar" }));
    expect(screen.getByRole("button", { name: "Eliminar mi cuenta" })).toBeInTheDocument();
    expect(screen.queryByLabelText(/contraseña para confirmar/)).not.toBeInTheDocument();
  });
});
