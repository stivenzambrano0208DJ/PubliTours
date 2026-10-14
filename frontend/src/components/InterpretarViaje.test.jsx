import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import InterpretarViaje from "./InterpretarViaje";

vi.mock("../api/client", () => ({ api: { interpretarViaje: vi.fn() } }));
import { api } from "../api/client";

const respuesta = (extra = {}) => ({
  presupuesto: 500000, dias: 3, preferencias: ["pareja"], municipio: "Florencia", categoria: null,
  resumen: "3 días · presupuesto $500.000 · Florencia · intereses: pareja", modo: "ia", ...extra,
});

describe("InterpretarViaje", () => {
  beforeEach(() => { api.interpretarViaje.mockReset(); });

  it("no permite enviar textos demasiado cortos", async () => {
    render(<InterpretarViaje onResultado={() => {}} />);
    const boton = screen.getByRole("button", { name: /Interpretar mi viaje/ });
    expect(boton).toBeDisabled();
    await userEvent.type(screen.getByPlaceholderText(/viaje romántico/), "hola");
    expect(boton).toBeDisabled();
  });

  it("envía el texto, muestra lo entendido y entrega los datos para rellenar el formulario", async () => {
    api.interpretarViaje.mockResolvedValue(respuesta());
    const onResultado = vi.fn();
    render(<InterpretarViaje onResultado={onResultado} />);

    await userEvent.type(screen.getByPlaceholderText(/viaje romántico/), "Viaje romántico de 3 días en Florencia con 500 mil");
    await userEvent.click(screen.getByRole("button", { name: /Interpretar mi viaje/ }));

    expect(api.interpretarViaje).toHaveBeenCalledWith("Viaje romántico de 3 días en Florencia con 500 mil");
    expect(await screen.findByText(/3 días · presupuesto \$500\.000/)).toBeInTheDocument();
    expect(screen.getByText("Interpretado con IA (Claude)")).toBeInTheDocument();
    expect(onResultado).toHaveBeenCalledWith(expect.objectContaining({ presupuesto: 500000, dias: 3 }));
  });

  it("indica que fue interpretación básica y qué datos faltan", async () => {
    api.interpretarViaje.mockResolvedValue(respuesta({ presupuesto: null, dias: null, modo: "basico", resumen: "Florencia" }));
    render(<InterpretarViaje onResultado={() => {}} />);
    await userEvent.type(screen.getByPlaceholderText(/viaje romántico/), "Quiero ir a Florencia");
    await userEvent.click(screen.getByRole("button", { name: /Interpretar mi viaje/ }));

    expect(await screen.findByText("Interpretación básica")).toBeInTheDocument();
    expect(screen.getByText(/No detectamos el presupuesto ni los días/)).toBeInTheDocument();
  });

  it("muestra el error sin tocar el formulario", async () => {
    api.interpretarViaje.mockRejectedValue(new Error("Alcanzaste el límite de consultas con IA por hora."));
    const onResultado = vi.fn();
    render(<InterpretarViaje onResultado={onResultado} />);
    await userEvent.type(screen.getByPlaceholderText(/viaje romántico/), "Quiero un viaje bonito");
    await userEvent.click(screen.getByRole("button", { name: /Interpretar mi viaje/ }));

    expect(await screen.findByText(/límite de consultas con IA/)).toBeInTheDocument();
    expect(onResultado).not.toHaveBeenCalled();
  });

  it("los ejemplos rellenan el cuadro de texto", async () => {
    render(<InterpretarViaje onResultado={() => {}} />);
    await userEvent.click(screen.getByRole("button", { name: /Fin de semana en familia/ }));
    expect(screen.getByPlaceholderText(/viaje romántico/)).toHaveValue("Fin de semana en familia con cascadas, presupuesto de $400.000");
  });
});
