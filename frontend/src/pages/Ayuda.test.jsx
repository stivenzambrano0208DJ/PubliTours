import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, within, waitFor, act } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import Ayuda from "./Ayuda";

vi.mock("../api/client", () => ({ api: { configuracion: vi.fn() } }));
import { api } from "../api/client";

const CONFIG = { comision_pct: 12, politicas_cancelacion: { flexible: 1, moderada: 3, estricta: 7 }, dias_gracia_asistencia: 4 };
const montar = () => render(<MemoryRouter><Ayuda /></MemoryRouter>);

describe("Ayuda", () => {
  beforeEach(() => { api.configuracion.mockReset(); });

  it("organiza las preguntas por tipo de persona", async () => {
    api.configuracion.mockResolvedValue(CONFIG);
    montar();
    for (const t of ["Si eres turista", "Si eres prestador", "Tu cuenta y tus datos"]) {
      expect(screen.getByRole("heading", { name: t })).toBeInTheDocument();
    }
    expect(screen.getByRole("heading", { level: 1, name: "Preguntas frecuentes" })).toBeInTheDocument();
    expect(screen.getByText("¿Mi reserva queda confirmada al instante?")).toBeInTheDocument();
  });

  it("usa las cifras del servidor, no números escritos a mano", async () => {
    api.configuracion.mockResolvedValue(CONFIG);
    montar();
    const cancelar = (await screen.findByText("¿Puedo cancelar o cambiar la fecha?")).closest("details");
    await userEvent.click(within(cancelar).getByText("¿Puedo cancelar o cambiar la fecha?"));
    expect(await within(cancelar).findByText(/Estricta: gratis hasta 7 días antes/)).toBeInTheDocument();
    expect(screen.getByText(/se completa sola a los 4 días/)).toBeInTheDocument();
    expect(screen.getByText(/comisión del 12 %/)).toBeInTheDocument();
  });

  it("si el servidor no responde, la página sigue siendo útil y no muestra cifras inventadas", async () => {
    api.configuracion.mockRejectedValue(new Error("sin red"));
    montar();
    // espera a que la consulta fallida termine (no hay nada visible que esperar: la página no cambia)
    await waitFor(() => { if (api.configuracion.mock.calls.length === 0) throw new Error("aún no consultó"); });
    await act(async () => { await new Promise((r) => setTimeout(r, 20)); });
    expect(screen.getByText("¿Hay comisión?")).toBeInTheDocument();
    expect(screen.queryByText(/ %/)).toBeNull();
    expect(screen.queryByText(/gratis hasta/)).toBeNull();
    expect(screen.getByText(/no se cobra/)).toBeInTheDocument();
  });

  it("aclara que la plataforma no procesa pagos y enlaza a las secciones que menciona", async () => {
    api.configuracion.mockResolvedValue(CONFIG);
    montar();
    expect(screen.getAllByText(/no procesa pagos/).length).toBeGreaterThanOrEqual(1); // al pagar y al pedir una devolución
    for (const enlace of screen.getAllByRole("link", { name: "Mis Reservas" })) expect(enlace).toHaveAttribute("href", "/mis-reservas");
    expect(screen.getByRole("link", { name: "política de privacidad" })).toHaveAttribute("href", "/privacidad");
  });
});

describe("Ayuda: mensajes con el negocio", () => {
  beforeEach(() => { api.configuracion.mockReset(); });

  it("explica cómo preguntar antes de reservar y cómo responde el negocio, enlazando a la bandeja", async () => {
    api.configuracion.mockResolvedValue({ ...CONFIG, mensajeria: { texto_max: 1500, fotos_max: 3, foto_max_mb: 5, motivos_reporte: [] } });
    montar();
    await userEvent.click(await screen.findByText("¿Puedo preguntarle algo al negocio antes de reservar?"));
    const respuesta = screen.getByText(/botón «Preguntar al negocio»/);
    expect(respuesta).toHaveTextContent("hasta 3 fotos"); // la cifra sale del servidor
    expect(respuesta).toHaveTextContent("correo verificado");
    expect(respuesta).toHaveTextContent("solo puede responder a quien le escribió");
    expect(within(respuesta).getByRole("link", { name: "Mensajes" })).toHaveAttribute("href", "/mensajes");

    await userEvent.click(screen.getByText("¿Cómo respondo a las preguntas de los clientes?"));
    expect(screen.getByText(/no puedes abrir conversaciones con turistas/)).toBeInTheDocument();
  });

  it("si no llegó la configuración no inventa el número de fotos", async () => {
    api.configuracion.mockRejectedValue(new Error("sin red"));
    montar();
    await userEvent.click(await screen.findByText("¿Puedo preguntarle algo al negocio antes de reservar?"));
    const respuesta = screen.getByText(/botón «Preguntar al negocio»/);
    expect(respuesta).toHaveTextContent("puedes adjuntar fotos)");
    expect(respuesta.textContent).not.toMatch(/hasta \d+ fotos/);
  });

  it("avisa que al eliminar la cuenta también se borran los mensajes", async () => {
    api.configuracion.mockResolvedValue(CONFIG);
    montar();
    await userEvent.click(await screen.findByText("¿Puedo descargar o borrar mis datos?"));
    expect(screen.getByText(/borra también tus mensajes y sus fotos/)).toBeInTheDocument();
  });
});
