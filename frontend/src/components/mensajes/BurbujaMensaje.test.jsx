import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import BurbujaMensaje from "./BurbujaMensaje";

const base = { id: 1, de: "turista", mio: false, texto: "Hola", retirado: false, creado_en: "2031-03-12T20:40:00Z", imagenes: [], contexto: null };
const montar = (mensaje, props = {}) => {
  const acciones = { onVerFoto: vi.fn(), onReportar: vi.fn() };
  render(<MemoryRouter><BurbujaMensaje mensaje={{ ...base, ...mensaje }} lado="turista" {...acciones} {...props} /></MemoryRouter>);
  return acciones;
};

describe("BurbujaMensaje", () => {
  it("muestra el texto como TEXTO (nunca como página) y respeta los saltos de línea", () => {
    const { container } = render(<MemoryRouter><BurbujaMensaje mensaje={{ ...base, texto: "<script>alert(1)</script>\nsegunda línea <b>negrita</b>" }} lado="turista" onVerFoto={() => {}} onReportar={() => {}} /></MemoryRouter>);
    expect(container.querySelector("script")).toBeNull();
    expect(container.querySelector("b")).toBeNull();
    expect(screen.getByText(/<script>alert\(1\)<\/script>/)).toHaveClass("whitespace-pre-wrap");
  });

  it("los mensajes propios van a la derecha y no se pueden reportar; los de la otra persona, a la izquierda y sí", async () => {
    const { onReportar } = montar({ mio: false, texto: "De la otra persona" });
    expect(screen.getByText("De la otra persona").closest("div.self-start")).not.toBeNull();
    await userEvent.click(screen.getByRole("button", { name: "Reportar este mensaje" }));
    expect(onReportar).toHaveBeenCalledWith(expect.objectContaining({ id: 1 }));
  });

  it("un mensaje propio no ofrece reportar", () => {
    montar({ mio: true, texto: "Mío" });
    expect(screen.getByText("Mío").closest("div.self-end")).not.toBeNull();
    expect(screen.queryByRole("button", { name: "Reportar este mensaje" })).toBeNull();
  });

  it("un mensaje retirado por la administración no muestra texto ni fotos ni permite reportar", () => {
    montar({ retirado: true, texto: null, imagenes: [] });
    expect(screen.getByText("Mensaje retirado por la administración.")).toBeInTheDocument();
    expect(screen.queryByRole("button")).toBeNull();
  });

  it("las fotos se piden a la ruta privada de fotos y se abren en grande al tocarlas", async () => {
    const { onVerFoto } = montar({ texto: null, imagenes: [{ id: 41 }, { id: 42 }] });
    const fotos = screen.getAllByAltText("Foto enviada en la conversación");
    expect(fotos).toHaveLength(2);
    expect(fotos[0].getAttribute("src")).toMatch(/\/api\/v1\/conversaciones\/imagenes\/41$/);
    expect(fotos[0].getAttribute("src")).not.toMatch(/uploads/); // nunca la carpeta pública
    await userEvent.click(screen.getAllByRole("button", { name: "Ver foto en grande" })[1]);
    expect(onVerFoto).toHaveBeenCalledWith(42);
  });

  it("el tema del mensaje enlaza al servicio, al paquete o a las reservas según quién lo lee", () => {
    const { rerender } = render(<MemoryRouter><BurbujaMensaje mensaje={{ ...base, contexto: { tipo: "sitio", id: 7, nombre: "Cascada" } }} lado="turista" onVerFoto={() => {}} onReportar={() => {}} /></MemoryRouter>);
    expect(screen.getByRole("link", { name: /Servicio: Cascada/ })).toHaveAttribute("href", "/sitios/7");
    rerender(<MemoryRouter><BurbujaMensaje mensaje={{ ...base, contexto: { tipo: "paquete", id: 3, nombre: "Aventura" } }} lado="turista" onVerFoto={() => {}} onReportar={() => {}} /></MemoryRouter>);
    expect(screen.getByRole("link", { name: /Paquete: Aventura/ })).toHaveAttribute("href", "/paquetes/3");
    rerender(<MemoryRouter><BurbujaMensaje mensaje={{ ...base, contexto: { tipo: "reserva", id: 9, nombre: "Cascada" } }} lado="turista" onVerFoto={() => {}} onReportar={() => {}} /></MemoryRouter>);
    expect(screen.getByRole("link", { name: /Reserva: Cascada/ })).toHaveAttribute("href", "/mis-reservas");
    rerender(<MemoryRouter><BurbujaMensaje mensaje={{ ...base, contexto: { tipo: "reserva", id: 9, nombre: "Cascada" } }} lado="negocio" onVerFoto={() => {}} onReportar={() => {}} /></MemoryRouter>);
    expect(screen.getByRole("link", { name: /Reserva: Cascada/ })).toHaveAttribute("href", "/mi-negocio");
  });

  it("si el servicio del tema ya no existe lo dice en vez de mostrar «null»", () => {
    montar({ contexto: { tipo: "sitio", id: 7, nombre: null } });
    expect(screen.getByRole("link", { name: /ya no disponible/ })).toBeInTheDocument();
  });
});
