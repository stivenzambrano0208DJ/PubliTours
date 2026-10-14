import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, act } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import AvisoVerificarCorreo from "./AvisoVerificarCorreo";

const actualizarUsuario = vi.fn();
let usuario;
vi.mock("../context/auth", () => ({ useAuth: () => ({ usuario, actualizarUsuario }) }));
vi.mock("../api/client", () => ({ api: { verificarCorreo: vi.fn(), reenviarVerificacion: vi.fn() } }));
import { api } from "../api/client";

describe("AvisoVerificarCorreo", () => {
  beforeEach(() => {
    usuario = { id: 1, rol: "turista", correo: "ana@test.com", correo_verificado: false };
    actualizarUsuario.mockReset();
    api.verificarCorreo.mockReset();
    api.reenviarVerificacion.mockReset();
  });
  afterEach(() => vi.useRealTimers());

  it("no aparece para quien ya verificó, para el administrador ni sin sesión", () => {
    for (const u of [{ ...usuario, correo_verificado: true }, { ...usuario, rol: "administrador" }, null]) {
      usuario = u;
      const { container, unmount } = render(<AvisoVerificarCorreo />);
      expect(container).toBeEmptyDOMElement();
      unmount();
    }
  });

  it("aparece con el correo al que se envió el código", () => {
    render(<AvisoVerificarCorreo />);
    expect(screen.getByRole("region", { name: "Verifica tu correo" })).toHaveTextContent("ana@test.com");
  });

  it("el botón Verificar solo se habilita con 6 dígitos y el campo ignora letras", async () => {
    render(<AvisoVerificarCorreo />);
    const campo = screen.getByLabelText("Código de verificación");
    const boton = screen.getByRole("button", { name: "Verificar" });
    await userEvent.type(campo, "12ab34");
    expect(campo).toHaveValue("1234");
    expect(boton).toBeDisabled();
    await userEvent.type(campo, "56");
    expect(boton).toBeEnabled();
  });

  it("con el código correcto marca el correo como verificado", async () => {
    api.verificarCorreo.mockResolvedValue({ correo_verificado: true });
    render(<AvisoVerificarCorreo />);
    await userEvent.type(screen.getByLabelText("Código de verificación"), "123456");
    await userEvent.click(screen.getByRole("button", { name: "Verificar" }));
    expect(api.verificarCorreo).toHaveBeenCalledWith("123456");
    expect(actualizarUsuario).toHaveBeenCalledWith({ correo_verificado: true });
  });

  it("con un código incorrecto muestra el error y no cambia la sesión", async () => {
    api.verificarCorreo.mockImplementation(() => Promise.reject(new Error("El código es inválido o ya expiró. Pide uno nuevo.")));
    render(<AvisoVerificarCorreo />);
    await userEvent.type(screen.getByLabelText("Código de verificación"), "000000");
    await userEvent.click(screen.getByRole("button", { name: "Verificar" }));
    expect(await screen.findByText(/inválido o ya expiró/)).toBeInTheDocument();
    expect(actualizarUsuario).not.toHaveBeenCalled();
  });

  it("reenviar pide un código nuevo y bloquea el botón con una cuenta regresiva", async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    api.reenviarVerificacion.mockResolvedValue({});
    render(<AvisoVerificarCorreo />);
    await userEvent.click(screen.getByRole("button", { name: "Reenviar código" }));
    expect(api.reenviarVerificacion).toHaveBeenCalled();
    expect(await screen.findByText(/Te enviamos un código nuevo a ana@test.com/)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Reenviar en \d+ s/ })).toBeDisabled();

    // la cuenta regresiva avanza un segundo por render, así que se simula segundo a segundo
    for (let i = 0; i < 61; i++) await act(async () => { vi.advanceTimersByTime(1000); });
    expect(screen.getByRole("button", { name: "Reenviar código" })).toBeEnabled();
  });

  it("si el reenvío falla (por ejemplo por la espera) muestra el motivo", async () => {
    api.reenviarVerificacion.mockImplementation(() => Promise.reject(new Error("Espera 40 segundos antes de pedir otro código.")));
    render(<AvisoVerificarCorreo />);
    await userEvent.click(screen.getByRole("button", { name: "Reenviar código" }));
    expect(await screen.findByText(/Espera 40 segundos/)).toBeInTheDocument();
  });
});
