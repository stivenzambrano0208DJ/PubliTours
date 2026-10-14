import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, act, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import IndicadorMensajes from "./IndicadorMensajes";
import { avisarCambioMensajes } from "../../hooks/useMensajesSinLeer";

vi.mock("../../api/client", async (original) => ({ ...(await original()), api: { mensajesSinLeer: vi.fn() } }));
import { api } from "../../api/client";

const montar = () => render(<MemoryRouter><IndicadorMensajes /></MemoryRouter>);

describe("IndicadorMensajes", () => {
  beforeEach(() => { api.mensajesSinLeer.mockReset(); });
  afterEach(() => { vi.useRealTimers(); });

  it("sin mensajes pendientes enlaza a la bandeja sin contador", async () => {
    api.mensajesSinLeer.mockResolvedValue({ total: 0 });
    montar();
    const enlace = screen.getByRole("link", { name: "Mensajes" });
    expect(enlace).toHaveAttribute("href", "/mensajes");
    await waitFor(() => expect(api.mensajesSinLeer).toHaveBeenCalled());
    expect(screen.queryByText("0")).toBeNull();
  });

  it("con mensajes sin leer muestra el número, y 99+ cuando son muchos", async () => {
    api.mensajesSinLeer.mockResolvedValue({ total: 3 });
    montar();
    expect(await screen.findByRole("link", { name: "Mensajes: 3 sin leer" })).toHaveTextContent("3");
    api.mensajesSinLeer.mockResolvedValue({ total: 250 });
    await act(async () => { avisarCambioMensajes(); });
    expect(await screen.findByRole("link", { name: "Mensajes: 250 sin leer" })).toHaveTextContent("99+");
  });

  it("se actualiza al momento cuando alguien lee o envía algo", async () => {
    api.mensajesSinLeer.mockResolvedValue({ total: 2 });
    montar();
    await screen.findByRole("link", { name: "Mensajes: 2 sin leer" });
    api.mensajesSinLeer.mockResolvedValue({ total: 0 });
    await act(async () => { avisarCambioMensajes(); });
    await waitFor(() => expect(screen.getByRole("link", { name: "Mensajes" })).toBeInTheDocument());
  });

  it("se actualiza solo cada 30 segundos mientras la pestaña está a la vista", async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    api.mensajesSinLeer.mockResolvedValue({ total: 0 });
    montar();
    await waitFor(() => expect(api.mensajesSinLeer).toHaveBeenCalledTimes(1));
    api.mensajesSinLeer.mockResolvedValue({ total: 4 });
    await act(async () => { await vi.advanceTimersByTimeAsync(30000); });
    expect(await screen.findByRole("link", { name: "Mensajes: 4 sin leer" })).toBeInTheDocument();
  });

  it("si la consulta falla conserva el último número en vez de borrarlo", async () => {
    api.mensajesSinLeer.mockResolvedValueOnce({ total: 5 });
    montar();
    await screen.findByRole("link", { name: "Mensajes: 5 sin leer" });
    api.mensajesSinLeer.mockRejectedValue(new Error("sin red"));
    await act(async () => { avisarCambioMensajes(); });
    expect(screen.getByRole("link", { name: "Mensajes: 5 sin leer" })).toBeInTheDocument();
  });

  it("no consulta mientras la pestaña está oculta", async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    api.mensajesSinLeer.mockResolvedValue({ total: 0 });
    montar();
    await waitFor(() => expect(api.mensajesSinLeer).toHaveBeenCalledTimes(1));
    const estado = vi.spyOn(document, "visibilityState", "get").mockReturnValue("hidden");
    await act(async () => { await vi.advanceTimersByTimeAsync(90000); });
    expect(api.mensajesSinLeer).toHaveBeenCalledTimes(1);
    estado.mockRestore();
  });
});
