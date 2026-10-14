import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor, act } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { AuthProvider } from "./AuthContext";
import { useAuth } from "./auth";
import { marcarSesion, haySesion, EVENTO_SESION_EXPIRADA } from "../api/client";

vi.mock("../api/client", async (original) => ({ ...(await original()), api: { me: vi.fn(), logout: vi.fn() } }));
import { api } from "../api/client";

function Estado() {
  const { usuario, cargando, login, logout } = useAuth();
  return (
    <div>
      <p data-testid="estado">{cargando ? "cargando" : usuario ? `sesión de ${usuario.nombre}` : "visitante"}</p>
      <button onClick={() => login({ nombre: "Luis" })}>entrar</button>
      <button onClick={logout}>salir</button>
    </div>
  );
}
const montar = () => render(<AuthProvider><Estado /></AuthProvider>);

describe("AuthProvider", () => {
  beforeEach(() => {
    localStorage.clear();
    api.me.mockReset();
    api.logout.mockReset();
    api.logout.mockResolvedValue({});
  });

  it("sin sesión recordada no consulta al servidor y es visitante de inmediato", async () => {
    montar();
    expect(screen.getByTestId("estado")).toHaveTextContent("visitante");
    expect(api.me).not.toHaveBeenCalled();
  });

  it("con sesión recordada la recupera desde el servidor (la cookie viaja sola)", async () => {
    marcarSesion(true);
    api.me.mockResolvedValue({ id: 1, nombre: "Ana" });
    montar();
    expect(screen.getByTestId("estado")).toHaveTextContent("cargando");
    await waitFor(() => expect(screen.getByTestId("estado")).toHaveTextContent("sesión de Ana"));
  });

  it("si la cookie ya no sirve queda como visitante y olvida la sesión", async () => {
    marcarSesion(true);
    api.me.mockRejectedValue(new Error("Token inválido"));
    montar();
    await waitFor(() => expect(screen.getByTestId("estado")).toHaveTextContent("visitante"));
    expect(haySesion()).toBe(false);
  });

  it("si el servidor rechaza la sesión a mitad de camino, la persona pasa a visitante", async () => {
    marcarSesion(true);
    api.me.mockResolvedValue({ id: 1, nombre: "Ana" });
    montar();
    await waitFor(() => expect(screen.getByTestId("estado")).toHaveTextContent("sesión de Ana"));
    act(() => { window.dispatchEvent(new Event(EVENTO_SESION_EXPIRADA)); });
    expect(screen.getByTestId("estado")).toHaveTextContent("visitante");
  });

  it("iniciar sesión la recuerda y cerrarla avisa al servidor para que borre la cookie", async () => {
    montar();
    await userEvent.click(screen.getByText("entrar"));
    expect(screen.getByTestId("estado")).toHaveTextContent("sesión de Luis");
    expect(haySesion()).toBe(true);

    await userEvent.click(screen.getByText("salir"));
    expect(screen.getByTestId("estado")).toHaveTextContent("visitante");
    expect(haySesion()).toBe(false);
    expect(api.logout).toHaveBeenCalledTimes(1);
  });

  it("cerrar sesión funciona aunque el servidor no responda", async () => {
    api.logout.mockRejectedValue(new Error("sin red"));
    montar();
    await userEvent.click(screen.getByText("entrar"));
    await userEvent.click(screen.getByText("salir"));
    expect(screen.getByTestId("estado")).toHaveTextContent("visitante");
  });
});
