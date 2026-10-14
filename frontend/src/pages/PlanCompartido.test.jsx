import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import PlanCompartido from "./PlanCompartido";

vi.mock("../api/client", () => ({ api: { itinerarioCompartido: vi.fn() }, urlImagen: (u) => u }));
import { api } from "../api/client";

const PLAN = {
  dias: 2, personas: 2, fecha_inicio: "2031-03-12",
  items: [
    { id: 1, dia: 1, orden: 1, justificacion: "Se incluyó porque es una actividad gratuita.", sitio: { id: 11, nombre: "Cascada La Diabla", municipio: "Morelia", categoria: "Naturaleza", precio: "0", imagen_url: null } },
    { id: 2, dia: 1, orden: 2, justificacion: "Se incluyó porque coincide con tus intereses: aventura.", sitio: { id: 12, nombre: "Karting", municipio: "Belén", categoria: "Aventura", precio: "30000", imagen_url: null } },
    { id: 3, dia: 2, orden: 1, justificacion: "x", sitio: { id: 13, nombre: "Piscinas AguaDulce", municipio: "Morelia", categoria: "Naturaleza", precio: "15000", imagen_url: null } },
  ],
};
const montar = (token = "tok_abcdefghijklmnop") => render(
  <MemoryRouter initialEntries={[`/plan/${token}`]}><Routes><Route path="/plan/:token" element={<PlanCompartido />} /></Routes></MemoryRouter>
);

describe("PlanCompartido", () => {
  beforeEach(() => { api.itinerarioCompartido.mockReset(); });

  it("muestra el plan por días, con precios del grupo y el total", async () => {
    api.itinerarioCompartido.mockResolvedValue(PLAN);
    montar();
    expect(await screen.findByRole("heading", { name: /Día 1/ })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: /Día 2/ })).toBeInTheDocument();
    expect(screen.getByText("2 días · 2 personas · desde el", { exact: false })).toBeInTheDocument();
    expect(screen.getByText("Cascada La Diabla")).toBeInTheDocument();
    expect(screen.getByText("Gratuito")).toBeInTheDocument();
    expect(screen.getByText("$60.000 COP")).toBeInTheDocument(); // 30.000 × 2 personas
    expect(screen.getByText("$90.000 COP")).toBeInTheDocument(); // total del grupo
    expect(screen.getAllByRole("link", { name: "Ver servicio" })[0]).toHaveAttribute("href", "/sitios/11");
    expect(api.itinerarioCompartido).toHaveBeenCalledWith("tok_abcdefghijklmnop");
  });

  it("pide que no se indexe y ofrece crear el propio itinerario", async () => {
    api.itinerarioCompartido.mockResolvedValue(PLAN);
    montar();
    await screen.findByRole("heading", { name: /Día 1/ });
    expect(document.querySelector("meta[name='robots']")?.getAttribute("content")).toMatch(/noindex/);
    expect(screen.getByRole("link", { name: /Crear mi itinerario/ })).toHaveAttribute("href", "/itinerario");
  });

  it("un plan sin fecha de inicio no inventa fechas", async () => {
    api.itinerarioCompartido.mockResolvedValue({ ...PLAN, fecha_inicio: null });
    montar();
    expect(await screen.findByRole("heading", { name: /Día 1/ })).toBeInTheDocument();
    expect(screen.queryByText(/desde el/)).toBeNull();
  });

  it("si ya ninguna actividad está disponible lo explica y no muestra un total", async () => {
    api.itinerarioCompartido.mockResolvedValue({ ...PLAN, items: [] });
    montar();
    expect(await screen.findByText(/ninguna de las actividades de este plan está disponible/)).toBeInTheDocument();
    expect(screen.queryByText(/Total estimado/)).toBeNull();
  });

  it("un enlace revocado o inexistente muestra el motivo y un camino a seguir", async () => {
    api.itinerarioCompartido.mockRejectedValue(new Error("Este itinerario no existe o ya no se comparte."));
    montar("revocado_abcdefghijk");
    expect(await screen.findByRole("heading", { name: "Este itinerario no está disponible" })).toBeInTheDocument();
    expect(screen.getByText("Este itinerario no existe o ya no se comparte.")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Crear mi propio itinerario" })).toHaveAttribute("href", "/itinerario");
  });
});
