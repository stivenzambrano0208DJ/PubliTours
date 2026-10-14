import { describe, it, expect } from "vitest";
import { render, screen, within } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import ListaConversaciones from "./ListaConversaciones";

const ahora = new Date().toISOString();
const conv = (id, extra = {}) => ({
  id, lado: "turista", contraparte: { nombre: `Negocio ${id}` }, sin_leer: 0, ultimo_mensaje_en: ahora,
  ultimo: { de: "negocio", mio: false, texto: `Texto ${id}`, con_fotos: false, retirado: false, creado_en: ahora }, ...extra,
});
const montar = (conversaciones, activaId) => render(<MemoryRouter><ListaConversaciones conversaciones={conversaciones} activaId={activaId} /></MemoryRouter>);

describe("ListaConversaciones", () => {
  it("sin conversaciones explica cómo empezar (clientes y negocios)", () => {
    montar([]);
    expect(screen.getByText("Aún no tienes mensajes")).toBeInTheDocument();
    expect(screen.getByText(/Pregunta lo que quieras desde la página de un servicio/)).toBeInTheDocument();
    expect(screen.getByText(/Si tienes un negocio/)).toBeInTheDocument();
  });

  it("cada conversación enlaza a la suya y muestra con quién es y de quién es el último mensaje", () => {
    montar([conv(1), conv(2, { lado: "negocio", contraparte: { nombre: "Laura Gómez" }, ultimo: { de: "turista", mio: false, texto: "¿Abren domingos?", con_fotos: false, retirado: false, creado_en: ahora } })]);
    const items = screen.getAllByRole("link");
    expect(items[0]).toHaveAttribute("href", "/mensajes/1");
    expect(within(items[0]).getByText("Negocio 1")).toBeInTheDocument();
    expect(within(items[0]).getByText("Negocio")).toBeInTheDocument(); // con quién habla: un negocio
    expect(within(items[1]).getByText("Laura Gómez")).toBeInTheDocument();
    expect(within(items[1]).getByText("Cliente")).toBeInTheDocument(); // desde el negocio, la otra parte es un cliente
  });

  it("la vista previa distingue lo propio, las fotos y los mensajes retirados", () => {
    montar([
      conv(1, { ultimo: { de: "turista", mio: true, texto: "Gracias", con_fotos: false, retirado: false, creado_en: ahora } }),
      conv(2, { ultimo: { de: "negocio", mio: false, texto: null, con_fotos: true, retirado: false, creado_en: ahora } }),
      conv(3, { ultimo: { de: "negocio", mio: false, texto: null, con_fotos: false, retirado: true, creado_en: ahora } }),
      conv(4, { ultimo: { de: "turista", mio: true, texto: null, con_fotos: true, retirado: false, creado_en: ahora } }),
    ]);
    expect(screen.getByText("Tú: Gracias")).toBeInTheDocument();
    expect(screen.getByText("Foto")).toBeInTheDocument();
    expect(screen.getByText("Mensaje retirado")).toBeInTheDocument();
    expect(screen.getByText("Tú: Foto")).toBeInTheDocument();
  });

  it("las conversaciones con mensajes sin leer muestran su cantidad y las demás no", () => {
    montar([conv(1, { sin_leer: 3 }), conv(2)]);
    expect(screen.getByLabelText("3 sin leer")).toHaveTextContent("3");
    expect(screen.queryByLabelText(/0 sin leer/)).toBeNull();
    expect(screen.getAllByLabelText(/sin leer/)).toHaveLength(1);
  });

  it("marca como actual la conversación abierta", () => {
    montar([conv(1), conv(2)], "2");
    const items = screen.getAllByRole("link");
    expect(items[1]).toHaveAttribute("aria-current", "page");
    expect(items[0]).not.toHaveAttribute("aria-current");
  });

  it("una conversación sin mensajes no se rompe", () => {
    montar([conv(1, { ultimo: null })]);
    expect(screen.getByText("Sin mensajes")).toBeInTheDocument();
  });
});
