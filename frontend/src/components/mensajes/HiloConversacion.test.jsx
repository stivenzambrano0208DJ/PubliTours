import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, waitFor, act, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import HiloConversacion from "./HiloConversacion";
import { EVENTO_MENSAJES } from "../../hooks/useMensajesSinLeer";

vi.mock("../../api/client", async (original) => ({
  ...(await original()),
  api: { conversacion: vi.fn(), marcarConversacionLeida: vi.fn(), enviarMensaje: vi.fn(), reportarMensaje: vi.fn(), configuracion: vi.fn() },
}));
import { api } from "../../api/client";

const CONFIG = { mensajeria: { texto_max: 1500, fotos_max: 3, foto_max_mb: 5, motivos_reporte: ["spam", "ofensivo", "contacto_externo", "estafa", "otro"] } };
const ahora = () => new Date().toISOString();
const msg = (id, extra = {}) => ({ id, de: "negocio", mio: false, texto: `Mensaje ${id}`, retirado: false, creado_en: ahora(), imagenes: [], contexto: null, ...extra });
const hilo = (extra = {}) => ({
  id: 5, lado: "turista", contraparte: { nombre: "Finca La Esperanza" }, puede_escribir: true, hay_mas: false,
  mensajes: [msg(1), msg(2, { mio: true, de: "turista", texto: "Mi pregunta" })], ...extra,
});
const montar = (onVolver = vi.fn()) => {
  render(<MemoryRouter><HiloConversacion id={5} onVolver={onVolver} /></MemoryRouter>);
  return onVolver;
};

describe("HiloConversacion", () => {
  beforeEach(() => {
    api.configuracion.mockReset().mockResolvedValue(CONFIG);
    api.conversacion.mockReset().mockResolvedValue(hilo());
    api.marcarConversacionLeida.mockReset().mockResolvedValue({});
    api.enviarMensaje.mockReset();
    api.reportarMensaje.mockReset();
  });
  afterEach(() => { vi.useRealTimers(); });

  it("muestra con quién se habla y los mensajes, y marca la conversación como leída al abrirla", async () => {
    const aviso = vi.fn();
    window.addEventListener(EVENTO_MENSAJES, aviso);
    montar();
    expect(await screen.findByRole("heading", { name: "Finca La Esperanza" })).toBeInTheDocument();
    expect(screen.getByText("Mensaje 1")).toBeInTheDocument();
    expect(screen.getByText("Mi pregunta")).toBeInTheDocument();
    expect(screen.getByText("Negocio")).toBeInTheDocument();
    await waitFor(() => expect(api.marcarConversacionLeida).toHaveBeenCalledWith(5));
    await waitFor(() => expect(aviso).toHaveBeenCalled()); // el contador del encabezado se actualiza
    window.removeEventListener(EVENTO_MENSAJES, aviso);
  });

  it("separa los mensajes por día con «Hoy» y «Ayer»", async () => {
    const ayer = new Date(Date.now() - 864e5 - 3600000).toISOString();
    api.conversacion.mockResolvedValue(hilo({ mensajes: [msg(1, { creado_en: ayer }), msg(2)] }));
    montar();
    await screen.findByText("Mensaje 1");
    expect(screen.getByText("Ayer")).toBeInTheDocument();
    expect(screen.getByText("Hoy")).toBeInTheDocument();
  });

  it("enviar agrega el mensaje al hilo y limpia la caja", async () => {
    api.enviarMensaje.mockResolvedValue(msg(3, { mio: true, de: "turista", texto: "¿Hay parqueadero?" }));
    montar();
    await screen.findByText("Mensaje 1");
    await userEvent.type(screen.getByLabelText("Escribe tu mensaje"), "¿Hay parqueadero?");
    await userEvent.click(screen.getByRole("button", { name: /Enviar/ }));
    expect(api.enviarMensaje).toHaveBeenCalledWith(5, "¿Hay parqueadero?", []);
    expect(await screen.findByText("¿Hay parqueadero?", { selector: "p" })).toBeInTheDocument();
    expect(screen.getByLabelText("Escribe tu mensaje")).toHaveValue("");
  });

  it("si no se puede enviar, el motivo del servidor aparece y el texto se conserva", async () => {
    api.enviarMensaje.mockRejectedValue(new Error("Estás enviando muchos mensajes. Espera unos minutos e inténtalo de nuevo."));
    montar();
    await screen.findByText("Mensaje 1");
    await userEvent.type(screen.getByLabelText("Escribe tu mensaje"), "Otro más");
    await userEvent.click(screen.getByRole("button", { name: /Enviar/ }));
    expect(await screen.findByRole("alert")).toHaveTextContent("Estás enviando muchos mensajes");
    expect(screen.getByLabelText("Escribe tu mensaje")).toHaveValue("Otro más");
  });

  it("si la conversación no existe o falla la carga, lo dice y deja volver a la bandeja", async () => {
    api.conversacion.mockRejectedValue(new Error("Conversación no encontrada."));
    const onVolver = montar();
    expect(await screen.findByRole("alert")).toHaveTextContent("Conversación no encontrada.");
    await userEvent.click(screen.getByRole("button", { name: "Volver a mis mensajes" }));
    expect(onVolver).toHaveBeenCalled();
    expect(api.marcarConversacionLeida).not.toHaveBeenCalled();
  });

  it("si el negocio ya no está disponible explica por qué no se puede escribir y no muestra la caja", async () => {
    api.conversacion.mockResolvedValue(hilo({ puede_escribir: false }));
    montar();
    expect(await screen.findByText(/no está disponible por el momento/)).toBeInTheDocument();
    expect(screen.queryByLabelText("Escribe tu mensaje")).toBeNull();
  });

  it("desde el negocio, la otra persona es el cliente y la caja invita a responder", async () => {
    api.conversacion.mockResolvedValue(hilo({ lado: "negocio", contraparte: { nombre: "Laura Gómez" } }));
    montar();
    expect(await screen.findByRole("heading", { name: "Laura Gómez" })).toBeInTheDocument();
    expect(screen.getByText("Cliente")).toBeInTheDocument();
    expect(screen.getByPlaceholderText("Escribe tu respuesta…")).toBeInTheDocument();
  });

  it("los mensajes anteriores se piden bajo demanda y se muestran antes de los actuales, sin repetirse", async () => {
    api.conversacion
      .mockResolvedValueOnce(hilo({ hay_mas: true, mensajes: [msg(11), msg(12)] }))
      .mockResolvedValueOnce({ ...hilo(), hay_mas: false, mensajes: [msg(9), msg(10), msg(11)] });
    montar();
    await screen.findByText("Mensaje 11");
    await userEvent.click(screen.getByRole("button", { name: "Ver mensajes anteriores" }));
    expect(api.conversacion).toHaveBeenLastCalledWith(5, { antes: 11 });
    await screen.findByText("Mensaje 9");
    const textos = screen.getAllByText(/^Mensaje \d+$/).map((n) => n.textContent);
    expect(textos).toEqual(["Mensaje 9", "Mensaje 10", "Mensaje 11", "Mensaje 12"]);
    expect(screen.queryByRole("button", { name: "Ver mensajes anteriores" })).toBeNull();
  });

  it("los mensajes nuevos llegan solos cada pocos segundos y se marcan como leídos", async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    montar();
    await screen.findByText("Mensaje 1");
    await waitFor(() => expect(api.marcarConversacionLeida).toHaveBeenCalledTimes(1));

    api.conversacion.mockResolvedValueOnce({ ...hilo(), mensajes: [msg(3, { texto: "Llegó una respuesta" })] });
    await act(async () => { await vi.advanceTimersByTimeAsync(5000); });
    expect(await screen.findByText("Llegó una respuesta")).toBeInTheDocument();
    expect(api.conversacion).toHaveBeenLastCalledWith(5, { despues: 2 }); // solo pide lo posterior al último que ya tenía
    await waitFor(() => expect(api.marcarConversacionLeida).toHaveBeenCalledTimes(2));
  });

  it("un mensaje retirado se muestra como retirado y una foto se abre en grande y se cierra con Escape", async () => {
    api.conversacion.mockResolvedValue(hilo({ mensajes: [msg(1, { retirado: true, texto: null }), msg(2, { texto: "Mira", imagenes: [{ id: 77 }] })] }));
    montar();
    expect(await screen.findByText("Mensaje retirado por la administración.")).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "Ver foto en grande" }));
    const visor = screen.getByRole("dialog", { name: "Foto" });
    expect(within(visor).getByAltText("Foto de la conversación").getAttribute("src")).toMatch(/imagenes\/77$/);
    await userEvent.keyboard("{Escape}");
    expect(screen.queryByRole("dialog", { name: "Foto" })).toBeNull();
  });

  it("se puede reportar un mensaje de la otra persona eligiendo un motivo", async () => {
    api.reportarMensaje.mockResolvedValue({});
    montar();
    await screen.findByText("Mensaje 1");
    await userEvent.click(screen.getByRole("button", { name: "Reportar este mensaje" }));
    const modal = screen.getByRole("dialog", { name: "Reportar mensaje" });
    const enviar = within(modal).getByRole("button", { name: "Enviar reporte" });
    expect(enviar).toBeDisabled(); // sin motivo no se envía
    await userEvent.selectOptions(within(modal).getByLabelText("Motivo"), "contacto_externo");
    await userEvent.type(within(modal).getByLabelText(/Detalle/), "  Pide pagar por fuera  ");
    await userEvent.click(enviar);
    expect(api.reportarMensaje).toHaveBeenCalledWith(1, { motivo: "contacto_externo", detalle: "Pide pagar por fuera" });
    expect(await within(modal).findByRole("status")).toHaveTextContent("La administración revisará este mensaje.");
  });

  it("si el reporte falla muestra el motivo (por ejemplo, que ya lo había reportado)", async () => {
    api.reportarMensaje.mockRejectedValue(new Error("Ya reportaste este mensaje."));
    montar();
    await screen.findByText("Mensaje 1");
    await userEvent.click(screen.getByRole("button", { name: "Reportar este mensaje" }));
    const modal = screen.getByRole("dialog", { name: "Reportar mensaje" });
    await userEvent.selectOptions(within(modal).getByLabelText("Motivo"), "spam");
    await userEvent.click(within(modal).getByRole("button", { name: "Enviar reporte" }));
    expect(await within(modal).findByRole("alert")).toHaveTextContent("Ya reportaste este mensaje.");
  });
});
