import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Routes, Route } from "react-router-dom";
import NotificacionesCampana from "./NotificacionesCampana";

vi.mock("../api/client", () => ({ api: { misNotificaciones: vi.fn(), marcarNotificacionLeida: vi.fn() } }));
import { api } from "../api/client";

const ahora = new Date().toISOString();
const notif = (id, extra = {}) => ({ id, tipo: "nueva_reserva", mensaje: `Mensaje ${id}`, leido: false, fecha: ahora, ...extra });

function montar() {
  return render(
    <MemoryRouter initialEntries={["/"]}>
      <Routes>
        <Route path="/" element={<NotificacionesCampana />} />
        <Route path="/mi-negocio" element={<p>Portal del prestador</p>} />
      </Routes>
    </MemoryRouter>
  );
}

describe("NotificacionesCampana", () => {
  beforeEach(() => {
    api.misNotificaciones.mockReset();
    api.marcarNotificacionLeida.mockReset().mockResolvedValue({});
  });

  it("muestra el contador de no leídas", async () => {
    api.misNotificaciones.mockResolvedValue([notif(1), notif(2), notif(3, { leido: true })]);
    montar();
    expect(await screen.findByText("2")).toBeInTheDocument();
  });

  it("alerta con 'Nueva reserva' cuando hay una única notificación sin leer", async () => {
    api.misNotificaciones.mockResolvedValue([notif(1, { mensaje: "Reserva para Cascada" })]);
    montar();
    expect(await screen.findByRole("alert")).toHaveTextContent("¡Nueva reserva!");
    expect(screen.getByRole("alert")).toHaveTextContent("Reserva para Cascada");
  });

  it("resume cuando hay varias sin leer", async () => {
    api.misNotificaciones.mockResolvedValue([notif(1), notif(2)]);
    montar();
    expect(await screen.findByRole("alert")).toHaveTextContent("Tienes 2 notificaciones sin leer.");
  });

  it("no alerta si todo está leído ni muestra contador", async () => {
    api.misNotificaciones.mockResolvedValue([notif(1, { leido: true })]);
    montar();
    await waitFor(() => expect(api.misNotificaciones).toHaveBeenCalled());
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });

  it("al abrir una notificación la marca como leída y navega a su pantalla", async () => {
    api.misNotificaciones.mockResolvedValue([notif(1, { mensaje: "Reserva para Cascada" })]);
    montar();
    await userEvent.click(await screen.findByRole("button", { name: "Notificaciones" }));
    await userEvent.click(screen.getByRole("button", { name: /Reserva para Cascada/ }));
    expect(api.marcarNotificacionLeida).toHaveBeenCalledWith(1);
    expect(await screen.findByText("Portal del prestador")).toBeInTheDocument();
  });

  it("'Marcar todas como leídas' marca cada notificación pendiente", async () => {
    api.misNotificaciones.mockResolvedValue([notif(1), notif(2)]);
    montar();
    await userEvent.click(await screen.findByRole("button", { name: "Notificaciones" }));
    await userEvent.click(screen.getByText("Marcar todas como leídas"));
    expect(api.marcarNotificacionLeida).toHaveBeenCalledTimes(2);
  });
});
