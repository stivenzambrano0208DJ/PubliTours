import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import ExportarItinerario from "./ExportarItinerario";

vi.mock("../api/client", () => ({ api: { compartirItinerario: vi.fn(), dejarDeCompartirItinerario: vi.fn() } }));
import { api } from "../api/client";

const itinerario = (extra = {}) => ({ id: 9, dias: 1, items: [], ...extra });
const montar = (extra) => render(<ExportarItinerario itinerario={itinerario(extra)} fechaInicio="2031-03-12" personas={2} />);

describe("ExportarItinerario: enlace público", () => {
  let copiar;
  beforeEach(() => {
    api.compartirItinerario.mockReset();
    api.dejarDeCompartirItinerario.mockReset();
    copiar = vi.fn().mockResolvedValue();
    Object.defineProperty(navigator, "clipboard", { value: { writeText: copiar }, configurable: true });
  });

  it("sin enlace ofrece crearlo; al crearlo lo muestra y lo copia", async () => {
    api.compartirItinerario.mockResolvedValue({ token: "tok_abcdefghijklmnop" });
    montar();
    expect(screen.queryByLabelText(/Enlace público/)).toBeNull();
    await userEvent.click(screen.getByRole("button", { name: /Crear enlace para compartir/ }));

    expect(api.compartirItinerario).toHaveBeenCalledWith(9);
    const campo = await screen.findByLabelText(/Enlace público/);
    expect(campo).toHaveValue(`${window.location.origin}/plan/tok_abcdefghijklmnop`);
    expect(campo).toHaveAttribute("readonly");
    expect(copiar).toHaveBeenCalledWith(`${window.location.origin}/plan/tok_abcdefghijklmnop`);
    expect(screen.getByRole("status")).toHaveTextContent(/Enlace copiado/);
  });

  it("si el itinerario ya estaba compartido muestra el enlace de una vez, sin pedirlo al servidor", () => {
    montar({ token_publico: "yaexistenteabcdefgh" });
    expect(screen.getByLabelText(/Enlace público/)).toHaveValue(`${window.location.origin}/plan/yaexistenteabcdefgh`);
    expect(api.compartirItinerario).not.toHaveBeenCalled();
  });

  it("«Dejar de compartir» revoca el enlace y vuelve a ofrecer crear uno", async () => {
    api.dejarDeCompartirItinerario.mockResolvedValue({});
    montar({ token_publico: "yaexistenteabcdefgh" });
    await userEvent.click(screen.getByRole("button", { name: /Dejar de compartir/ }));
    expect(api.dejarDeCompartirItinerario).toHaveBeenCalledWith(9);
    expect(await screen.findByRole("button", { name: /Crear enlace para compartir/ })).toBeInTheDocument();
    expect(screen.queryByLabelText(/Enlace público/)).toBeNull();
    expect(screen.getByRole("status")).toHaveTextContent(/ya no funciona/);
  });

  it("si el servidor falla muestra el motivo y no inventa un enlace", async () => {
    api.compartirItinerario.mockRejectedValue(new Error("No puede compartir el itinerario de otro usuario."));
    montar();
    await userEvent.click(screen.getByRole("button", { name: /Crear enlace para compartir/ }));
    expect(await screen.findByText("No puede compartir el itinerario de otro usuario.")).toBeInTheDocument();
    expect(screen.queryByLabelText(/Enlace público/)).toBeNull();
  });

  it("si no se puede copiar automáticamente, lo dice pero el enlace queda visible", async () => {
    copiar.mockRejectedValue(new Error("denegado"));
    api.compartirItinerario.mockResolvedValue({ token: "tok_abcdefghijklmnop" });
    montar();
    await userEvent.click(screen.getByRole("button", { name: /Crear enlace para compartir/ }));
    expect(await screen.findByLabelText(/Enlace público/)).toBeInTheDocument();
    expect(screen.getByRole("status")).toHaveTextContent(/No se pudo copiar automáticamente/);
  });
});
