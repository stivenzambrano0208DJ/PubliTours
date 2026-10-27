import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import ModalServicio from "./ModalServicio";

vi.mock("../mapa/MapaSeleccionar", () => ({ default: () => null }));
vi.mock("../../api/client", () => ({ api: { crearSitio: vi.fn(), actualizarSitio: vi.fn(), fechasBloqueadas: vi.fn().mockResolvedValue([]) }, urlImagen: (u) => u }));
import { api } from "../../api/client";

const perfil = { id: 1, nombre_negocio: "Finca El Paraíso", categoria: "Hospedaje", municipio: "Florencia" };
const montar = (props = {}) => render(<ModalServicio perfil={perfil} onCerrar={() => {}} onGuardado={() => {}} {...props} />);
const opciones = () => Array.from(screen.getByRole("combobox", { name: "Categoría" }).querySelectorAll("option")).map((o) => o.textContent);

describe("ModalServicio: categoría", () => {
  it("ofrece las categorías predeterminadas en una lista y no como texto libre", () => {
    montar();
    const lista = screen.getByRole("combobox", { name: "Categoría" });
    expect(lista.tagName).toBe("SELECT");
    expect(opciones()).toEqual([
      "Selecciona una categoría...", "Naturaleza y Guianza", "Deportes y Aventura", "Hospedaje / Glamping", "Gastronomía Amazónica",
    ]);
  });

  it("un servicio nuevo parte de la categoría del propio negocio", () => {
    montar();
    expect(screen.getByRole("combobox", { name: "Categoría" })).toHaveValue("Hospedaje");
  });

  it("si la categoría del negocio no es una de las predeterminadas, no se inventa una: queda por elegir", () => {
    montar({ perfil: { ...perfil, categoria: "Cualquier cosa" } });
    expect(screen.getByRole("combobox", { name: "Categoría" })).toHaveValue("");
    expect(opciones()).not.toContain("Cualquier cosa");
  });

  it("un servicio antiguo con una categoría escrita a mano la conserva al editarlo", () => {
    montar({ sitio: { id: 9, nombre: "Tour", categoria: "Cultura", municipio: "Florencia", precio: 1000, tarifas: [], imagenes: [] } });
    expect(screen.getByRole("combobox", { name: "Categoría" })).toHaveValue("Cultura");
    expect(opciones()).toContain("Cultura");
  });

  it("al guardar manda el valor de la categoría elegida", async () => {
    api.crearSitio.mockResolvedValue({ id: 1 });
    montar();
    await userEvent.selectOptions(screen.getByRole("combobox", { name: "Categoría" }), "Aventura");
    expect(screen.getByRole("combobox", { name: "Categoría" })).toHaveValue("Aventura");
  });
});
