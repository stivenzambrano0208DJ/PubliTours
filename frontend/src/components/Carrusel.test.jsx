import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, act, fireEvent } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import Carrusel from "./Carrusel";

// jsdom no calcula el layout: se simulan tarjetas de 300 px en una pista de 900 px (3 visibles).
const PASO = 300;
let scrollTo;

beforeEach(() => {
  scrollTo = vi.fn();
  Element.prototype.scrollTo = scrollTo;
  Object.defineProperty(HTMLElement.prototype, "offsetLeft", {
    configurable: true,
    get() { return Array.prototype.indexOf.call(this.parentElement?.children || [], this) * PASO; },
  });
  Object.defineProperty(HTMLElement.prototype, "clientWidth", { configurable: true, get() { return 900; } });
  window.matchMedia = vi.fn(() => ({ matches: false }));
});
afterEach(() => { vi.useRealTimers(); });

const montar = (n = 5, props = {}) =>
  render(<Carrusel {...props}>{Array.from({ length: n }, (_, i) => <article key={i}>Destino {i + 1}</article>)}</Carrusel>);

const puntoActivo = () => screen.getAllByRole("button", { name: /Ir a la diapositiva/ }).findIndex((b) => b.getAttribute("aria-current") === "true");

describe("Carrusel", () => {
  it("muestra todas las tarjetas y un punto por cada posición posible", () => {
    montar(5); // 5 tarjetas, 3 visibles => 3 posiciones
    expect(screen.getAllByText(/Destino \d/)).toHaveLength(5);
    expect(screen.getAllByRole("button", { name: /Ir a la diapositiva/ })).toHaveLength(3);
    expect(puntoActivo()).toBe(0);
  });

  it("sin tarjetas de más no muestra flechas ni puntos", () => {
    montar(3); // caben las 3
    expect(screen.queryByRole("button", { name: "Siguiente" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /Ir a la diapositiva/ })).not.toBeInTheDocument();
  });

  it("no renderiza nada si no hay elementos", () => {
    const { container } = render(<Carrusel>{[]}</Carrusel>);
    expect(container).toBeEmptyDOMElement();
  });

  it("la flecha Siguiente avanza una tarjeta y los puntos lo reflejan", async () => {
    montar(5);
    await userEvent.click(screen.getByRole("button", { name: "Siguiente" }));
    expect(scrollTo).toHaveBeenLastCalledWith({ left: PASO, behavior: "smooth" });
    expect(puntoActivo()).toBe(1);
  });

  it("al llegar al final, Siguiente vuelve al inicio y Anterior desde el inicio va al final", async () => {
    montar(5);
    await userEvent.click(screen.getByRole("button", { name: "Anterior" })); // desde el inicio => última posición
    expect(scrollTo).toHaveBeenLastCalledWith({ left: 2 * PASO, behavior: "smooth" });
    expect(puntoActivo()).toBe(2);
    await userEvent.click(screen.getByRole("button", { name: "Siguiente" })); // desde el final => inicio
    expect(scrollTo).toHaveBeenLastCalledWith({ left: 0, behavior: "smooth" });
    expect(puntoActivo()).toBe(0);
  });

  it("un punto lleva directo a su posición", async () => {
    montar(5);
    await userEvent.click(screen.getByRole("button", { name: "Ir a la diapositiva 3" }));
    expect(scrollTo).toHaveBeenLastCalledWith({ left: 2 * PASO, behavior: "smooth" });
  });

  it("avanza solo cada cierto tiempo y vuelve al inicio al terminar", () => {
    vi.useFakeTimers();
    montar(5, { intervaloMs: 1000 });
    act(() => { vi.advanceTimersByTime(1000); });
    expect(puntoActivo()).toBe(1);
    act(() => { vi.advanceTimersByTime(1000); });
    expect(puntoActivo()).toBe(2);
    act(() => { vi.advanceTimersByTime(1000); });
    expect(puntoActivo()).toBe(0); // dio la vuelta
  });

  it("se detiene mientras el mouse está encima", () => {
    vi.useFakeTimers();
    montar(5, { intervaloMs: 1000 });
    const region = screen.getByRole("region", { name: "Carrusel" });
    fireEvent.mouseEnter(region);
    act(() => { vi.advanceTimersByTime(5000); });
    expect(puntoActivo()).toBe(0);
    fireEvent.mouseLeave(region);
    act(() => { vi.advanceTimersByTime(1000); });
    expect(puntoActivo()).toBe(1);
  });

  it("no avanza solo si el usuario prefiere reducir el movimiento", () => {
    vi.useFakeTimers();
    window.matchMedia = vi.fn(() => ({ matches: true }));
    montar(5, { intervaloMs: 1000 });
    act(() => { vi.advanceTimersByTime(5000); });
    expect(puntoActivo()).toBe(0);
  });
});
