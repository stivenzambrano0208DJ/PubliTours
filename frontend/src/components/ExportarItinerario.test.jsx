import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import ExportarItinerario from "./ExportarItinerario";
import ItinerarioImprimible from "./ItinerarioImprimible";
import { textoItinerario, totalEstimado, itemsPorDia } from "../utils/itinerario";

const itinerario = {
  dias: 2,
  items: [
    { id: 1, dia: 1, sitio: { nombre: "Cascada La Diabla", municipio: "Morelia", categoria: "Naturaleza", precio: "0" } },
    { id: 2, dia: 1, sitio: { nombre: "Karting", municipio: "Belén", categoria: "Aventura", precio: "30000" } },
    { id: 3, dia: 2, sitio: { nombre: "Piscinas AguaDulce", municipio: "Morelia", categoria: "Naturaleza", precio: "15000" } },
  ],
};
const props = { itinerario, fechaInicio: "2031-03-12", personas: 2 };

describe("texto del itinerario", () => {
  it("agrupa por día y suma el total del grupo", () => {
    expect(itemsPorDia(itinerario.items).map((d) => [d.dia, d.items.length])).toEqual([[1, 2], [2, 1]]);
    expect(totalEstimado(itinerario.items, 2)).toBe(90000); // (0 + 30.000 + 15.000) × 2
  });

  it("incluye fechas, precios por grupo y total, sin inventar datos", () => {
    const texto = textoItinerario(props);
    expect(texto).toContain("2 día(s) · 2 personas");
    expect(texto).toContain("Día 1");
    expect(texto).toContain("Día 2");
    expect(texto).toContain("- Cascada La Diabla (Morelia) — gratis");
    expect(texto).toMatch(/- Karting \(Belén\) — \$60\.000/);
    expect(texto).toContain("Total estimado: $90.000 COP");
  });
});

describe("ExportarItinerario", () => {
  beforeEach(() => { window.print = vi.fn(); });
  afterEach(() => { delete navigator.share; });

  it("Guardar PDF abre el diálogo de impresión", async () => {
    render(<ExportarItinerario {...props} />);
    await userEvent.click(screen.getByRole("button", { name: /Guardar PDF/ }));
    expect(window.print).toHaveBeenCalled();
  });

  it("Compartir usa el menú del dispositivo cuando existe", async () => {
    navigator.share = vi.fn().mockResolvedValue();
    render(<ExportarItinerario {...props} />);
    await userEvent.click(screen.getByRole("button", { name: /Compartir/ }));
    expect(navigator.share).toHaveBeenCalledWith(expect.objectContaining({ text: expect.stringContaining("Total estimado: $90.000 COP") }));
  });

  it("sin menú de compartir copia el texto al portapapeles y lo avisa", async () => {
    const writeText = vi.fn().mockResolvedValue();
    Object.defineProperty(navigator, "clipboard", { value: { writeText }, configurable: true });
    render(<ExportarItinerario {...props} />);
    await userEvent.click(screen.getByRole("button", { name: /Compartir/ }));
    expect(writeText).toHaveBeenCalledWith(expect.stringContaining("Mi itinerario en el Caquetá"));
    expect(await screen.findByRole("status")).toHaveTextContent("copiado");
  });

  it("cancelar el menú de compartir no muestra ningún error", async () => {
    navigator.share = vi.fn().mockRejectedValue(Object.assign(new Error("cancelado"), { name: "AbortError" }));
    render(<ExportarItinerario {...props} />);
    await userEvent.click(screen.getByRole("button", { name: /Compartir/ }));
    expect(screen.queryByRole("status")).not.toBeInTheDocument();
  });
});

describe("ItinerarioImprimible", () => {
  it("muestra cada día con sus actividades y el total, solo para impresión", () => {
    render(<ItinerarioImprimible {...props} />);
    const hoja = screen.getByLabelText("Itinerario para imprimir");
    expect(hoja).toHaveClass("hidden", "print:block");
    expect(hoja).toHaveTextContent("Cascada La Diabla");
    expect(hoja).toHaveTextContent("Gratis");
    expect(hoja).toHaveTextContent("$60.000");
    expect(hoja).toHaveTextContent("$90.000 COP");
  });
});
