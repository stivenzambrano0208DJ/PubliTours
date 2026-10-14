import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter, Routes, Route } from "react-router-dom";
import Negocio from "./Negocio";

vi.mock("../api/client", () => ({ api: { negocioPublico: vi.fn() }, urlImagen: (u) => u }));
import { api } from "../api/client";

const base = {
  id: 3, nombre_negocio: "Finca El Paraíso", categoria: "Hospedaje", municipio: "Florencia", descripcion: "Cabañas junto al río.",
  telefono: "3001234567", direccion: "Vereda El Caraño, km 4", redes: "instagram.com/finca", miembro_desde: "2026-03-10T00:00:00Z",
  servicios: [{ id: 11, nombre: "Cabañas del río", categoria: "Hospedaje", municipio: "Florencia", precio: "80000", imagen_url: null, calificacion_promedio: 5, total_resenas: 1 }],
  paquetes: [{ id: 21, nombre: "Fin de semana", precio: "100000", ahorro: 20000, precio_suelto: 120000, items: [{ id: 1, sitio: { nombre: "Cabañas del río" } }, { id: 2, sitio: { nombre: "Cabalgata" } }] }],
  resenas: { total: 2, promedio: 4, recientes: [
    { id: 1, calificacion: 5, comentario: "Excelente", fecha: "2026-05-01T00:00:00Z", turista: { nombre: "Ana" }, SitioTuristico: { nombre: "Cabañas del río" }, Paquete: null, respuesta: "¡Gracias!" },
    { id: 2, calificacion: 3, comentario: "Regular", fecha: "2026-05-02T00:00:00Z", turista: { nombre: "Luis" }, SitioTuristico: null, Paquete: { nombre: "Fin de semana" }, respuesta: null },
  ] },
};

const montar = () => render(
  <MemoryRouter initialEntries={["/negocios/3"]}>
    <Routes><Route path="/negocios/:id" element={<Negocio />} /></Routes>
  </MemoryRouter>
);

describe("Negocio (página pública)", () => {
  beforeEach(() => { api.negocioPublico.mockReset(); });

  it("muestra el negocio con su contacto, servicios, paquetes y reseñas", async () => {
    api.negocioPublico.mockResolvedValue(base);
    montar();
    expect(await screen.findByRole("heading", { name: "Finca El Paraíso" })).toBeInTheDocument();
    expect(api.negocioPublico).toHaveBeenCalledWith("3");
    expect(screen.getByText("Negocio verificado")).toBeInTheDocument();
    expect(screen.getByText("Cabañas junto al río.")).toBeInTheDocument();
    expect(screen.getByText("Vereda El Caraño, km 4")).toBeInTheDocument();
    expect(screen.getByText(/4 \(2 reseñas\)/)).toBeInTheDocument();

    expect(screen.getByRole("heading", { name: "Servicios (1)" })).toBeInTheDocument();
    const destinos = screen.getAllByRole("link").map((a) => a.getAttribute("href"));
    expect(destinos).toContain("/sitios/11");
    expect(destinos).toContain("/paquetes/21");
    expect(screen.getByText("Paquete: Fin de semana")).toBeInTheDocument();
    expect(screen.getByText("¡Gracias!")).toBeInTheDocument(); // respuesta del negocio
  });

  it("el botón de WhatsApp y el de redes usan enlaces seguros", async () => {
    api.negocioPublico.mockResolvedValue(base);
    montar();
    const wa = await screen.findByRole("link", { name: /WhatsApp/ });
    expect(wa).toHaveAttribute("href", "https://wa.me/573001234567");
    expect(wa).toHaveAttribute("rel", expect.stringContaining("noopener"));
    expect(screen.getByRole("link", { name: /Redes y sitio web/ })).toHaveAttribute("href", "https://instagram.com/finca");
  });

  it("si las redes no son un enlace válido las muestra como texto, sin enlace", async () => {
    api.negocioPublico.mockResolvedValue({ ...base, redes: "javascript:alert(1)", telefono: null });
    montar();
    await screen.findByRole("heading", { name: "Finca El Paraíso" });
    expect(screen.queryByRole("link", { name: /Redes y sitio web/ })).not.toBeInTheDocument();
    expect(screen.queryByRole("link", { name: /WhatsApp/ })).not.toBeInTheDocument();
    expect(screen.getByText("javascript:alert(1)")).toBeInTheDocument();
  });

  it("sin servicios, paquetes ni reseñas muestra mensajes en vez de secciones vacías", async () => {
    api.negocioPublico.mockResolvedValue({ ...base, servicios: [], paquetes: [], resenas: { total: 0, promedio: null, recientes: [] } });
    montar();
    expect(await screen.findByText(/aún no tiene servicios publicados/)).toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: /Paquetes/ })).not.toBeInTheDocument();
    expect(screen.getByText(/Aún no hay reseñas/)).toBeInTheDocument();
  });

  it("un negocio que no existe o no está aprobado muestra el error", async () => {
    api.negocioPublico.mockRejectedValue(new Error("Negocio no encontrado."));
    montar();
    expect(await screen.findByText("Negocio no encontrado.")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Explorar destinos" })).toBeInTheDocument();
  });
});
