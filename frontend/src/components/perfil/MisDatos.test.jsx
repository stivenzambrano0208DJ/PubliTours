import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import MisDatos from "./MisDatos";

const actualizarUsuario = vi.fn();
vi.mock("../../context/auth", () => ({
  useAuth: () => ({ usuario: { id: 1, nombre: "Ana Pérez", correo: "ana@test.com" }, actualizarUsuario, logout: vi.fn() }),
}));
vi.mock("../../api/client", () => ({ api: { actualizarPerfil: vi.fn(), cambiarPassword: vi.fn() } }));
import { api } from "../../api/client";

describe("MisDatos", () => {
  beforeEach(() => {
    actualizarUsuario.mockReset();
    api.actualizarPerfil.mockReset();
    api.cambiarPassword.mockReset();
  });

  it("precarga nombre y correo del usuario", () => {
    render(<MemoryRouter><MisDatos /></MemoryRouter>);
    expect(screen.getByDisplayValue("Ana Pérez")).toBeInTheDocument();
    expect(screen.getByDisplayValue("ana@test.com")).toBeInTheDocument();
  });

  it("guarda los datos y actualiza la sesión", async () => {
    api.actualizarPerfil.mockResolvedValue({ id: 1, nombre: "Ana María", correo: "ana@test.com" });
    render(<MemoryRouter><MisDatos /></MemoryRouter>);
    const nombre = screen.getByDisplayValue("Ana Pérez");
    await userEvent.clear(nombre);
    await userEvent.type(nombre, "Ana María");
    await userEvent.click(screen.getByRole("button", { name: "Guardar cambios" }));

    expect(api.actualizarPerfil).toHaveBeenCalledWith({ nombre: "Ana María", correo: "ana@test.com" });
    expect(actualizarUsuario).toHaveBeenCalledWith({ id: 1, nombre: "Ana María", correo: "ana@test.com" });
    expect(await screen.findByText("Datos actualizados.")).toBeInTheDocument();
  });

  it("muestra el error del servidor al cambiar el correo (p. ej. duplicado)", async () => {
    api.actualizarPerfil.mockRejectedValue(new Error("Ese correo ya está registrado por otra cuenta."));
    render(<MemoryRouter><MisDatos /></MemoryRouter>);
    await userEvent.click(screen.getByRole("button", { name: "Guardar cambios" }));
    expect(await screen.findByText("Ese correo ya está registrado por otra cuenta.")).toBeInTheDocument();
    expect(actualizarUsuario).not.toHaveBeenCalled();
  });

  it("no envía el cambio de contraseña si las nuevas no coinciden", async () => {
    render(<MemoryRouter><MisDatos /></MemoryRouter>);
    const [actual, nueva, repetir] = document.querySelectorAll('input[type="password"]');
    await userEvent.type(actual, "claveActual1");
    await userEvent.type(nueva, "nuevaClave123");
    await userEvent.type(repetir, "otraDistinta1");
    await userEvent.click(screen.getByRole("button", { name: "Actualizar contraseña" }));
    expect(screen.getByText("Las contraseñas nuevas no coinciden.")).toBeInTheDocument();
    expect(api.cambiarPassword).not.toHaveBeenCalled();
  });

  it("cambia la contraseña y limpia el formulario", async () => {
    api.cambiarPassword.mockResolvedValue({ mensaje: "ok" });
    render(<MemoryRouter><MisDatos /></MemoryRouter>);
    const [actual, nueva, repetir] = document.querySelectorAll('input[type="password"]');
    await userEvent.type(actual, "claveActual1");
    await userEvent.type(nueva, "nuevaClave123");
    await userEvent.type(repetir, "nuevaClave123");
    await userEvent.click(screen.getByRole("button", { name: "Actualizar contraseña" }));

    expect(api.cambiarPassword).toHaveBeenCalledWith({ actual: "claveActual1", nueva: "nuevaClave123" });
    expect(await screen.findByText("Contraseña actualizada.")).toBeInTheDocument();
    expect(actual).toHaveValue("");
  });
});
