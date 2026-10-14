import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor, act } from "@testing-library/react";
import { MemoryRouter, Routes, Route } from "react-router-dom";
import Mensajes from "./Mensajes";
import { avisarCambioMensajes } from "../hooks/useMensajesSinLeer";

vi.mock("../api/client", async (original) => ({
  ...(await original()),
  api: { conversaciones: vi.fn(), conversacion: vi.fn(), marcarConversacionLeida: vi.fn(), enviarMensaje: vi.fn(), configuracion: vi.fn() },
}));
import { api } from "../api/client";

const ahora = new Date().toISOString();
const conv = (id, extra = {}) => ({ id, lado: "turista", contraparte: { nombre: `Negocio ${id}` }, sin_leer: 0, ultimo_mensaje_en: ahora, ultimo: { de: "negocio", mio: false, texto: `Último ${id}`, con_fotos: false, retirado: false, creado_en: ahora }, ...extra });
const hilo = (id) => ({ id, lado: "turista", contraparte: { nombre: `Negocio ${id}` }, puede_escribir: true, hay_mas: false, mensajes: [{ id: 1, de: "negocio", mio: false, texto: `Hola desde ${id}`, retirado: false, creado_en: ahora, imagenes: [], contexto: null }] });
const montar = (ruta = "/mensajes") => render(
  <MemoryRouter initialEntries={[ruta]}>
    <Routes><Route path="/mensajes" element={<Mensajes />} /><Route path="/mensajes/:id" element={<Mensajes />} /></Routes>
  </MemoryRouter>
);

describe("Mensajes (bandeja)", () => {
  beforeEach(() => {
    api.conversaciones.mockReset().mockResolvedValue([conv(1), conv(2, { sin_leer: 2 })]);
    api.conversacion.mockReset().mockImplementation((id) => Promise.resolve(hilo(Number(id))));
    api.marcarConversacionLeida.mockReset().mockResolvedValue({});
    api.configuracion.mockReset().mockResolvedValue({ mensajeria: { texto_max: 1500, fotos_max: 3, foto_max_mb: 5, motivos_reporte: [] } });
  });

  it("sin una conversación elegida muestra la lista y una invitación a elegir", async () => {
    montar();
    expect(await screen.findByRole("link", { name: /Negocio 1/ })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /Negocio 2/ })).toBeInTheDocument();
    expect(screen.getByText("Elige una conversación para verla.")).toBeInTheDocument();
    expect(api.conversacion).not.toHaveBeenCalled();
  });

  it("con una conversación elegida (por la dirección) la abre junto a la lista, con la actual resaltada", async () => {
    montar("/mensajes/2");
    expect(await screen.findByText("Hola desde 2")).toBeInTheDocument();
    expect(api.conversacion).toHaveBeenCalledWith("2");
    expect(await screen.findByRole("link", { name: /Negocio 2/ })).toHaveAttribute("aria-current", "page");
  });

  it("si no hay conversaciones explica cómo empezar", async () => {
    api.conversaciones.mockResolvedValue([]);
    montar();
    expect(await screen.findByText("Aún no tienes mensajes")).toBeInTheDocument();
  });

  it("si la lista no carga, lo dice", async () => {
    api.conversaciones.mockRejectedValue(new Error("No se pudo cargar."));
    montar();
    expect(await screen.findByRole("alert")).toHaveTextContent("No se pudo cargar.");
  });

  it("la lista se actualiza al momento cuando se lee o se envía algo en una conversación", async () => {
    montar();
    await screen.findByRole("link", { name: /Negocio 2/ });
    expect(screen.getByLabelText("2 sin leer")).toBeInTheDocument();
    api.conversaciones.mockResolvedValue([conv(1), conv(2, { sin_leer: 0 })]);
    await act(async () => { avisarCambioMensajes(); });
    await waitFor(() => expect(screen.queryByLabelText(/sin leer/)).toBeNull());
  });

  it("una conversación inexistente muestra el error sin romper la lista", async () => {
    api.conversacion.mockRejectedValue(new Error("Conversación no encontrada."));
    montar("/mensajes/999");
    expect(await screen.findByText("Conversación no encontrada.")).toBeInTheDocument();
    expect(await screen.findByRole("link", { name: /Negocio 1/ })).toBeInTheDocument();
  });
});
