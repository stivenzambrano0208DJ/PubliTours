import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import Terminos from "./Terminos";
import Privacidad from "./Privacidad";
import Footer from "../components/Footer";
import { VERSION_TERMINOS } from "../constants";

vi.mock("../api/client", () => ({ api: { configuracion: vi.fn(() => Promise.resolve({ comision_pct: 10 })) } }));

const dentroDeRouter = (ui) => render(<MemoryRouter>{ui}</MemoryRouter>);

describe("páginas legales", () => {
  it("los Términos muestran la versión vigente y los temas clave", () => {
    dentroDeRouter(<Terminos />);
    expect(screen.getByRole("heading", { level: 1, name: /Términos y Condiciones/ })).toBeInTheDocument();
    expect(screen.getByText(`Versión ${VERSION_TERMINOS}`)).toBeInTheDocument();
    for (const tema of [/Qué es PubliTours/, /Reservas/, /Reseñas y contenido/, /Inteligencia artificial/, /Responsabilidad/]) {
      expect(screen.getByRole("heading", { name: tema })).toBeInTheDocument();
    }
    expect(screen.getByText(/no procesa pagos/)).toBeInTheDocument(); // aclara que no hay pagos en la plataforma
    expect(screen.getByText(/Comisión./)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Política de Privacidad" })).toHaveAttribute("href", "/privacidad");
  });

  it("la Política de Privacidad cita la ley, los derechos y la autoridad de control", () => {
    dentroDeRouter(<Privacidad />);
    expect(screen.getByRole("heading", { level: 1, name: /Tratamiento de Datos Personales/ })).toBeInTheDocument();
    expect(screen.getByText(/Ley 1581 de 2012/)).toBeInTheDocument();
    expect(screen.getByText(/Superintendencia de Industria y Comercio/)).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: /Tus derechos como titular/ })).toBeInTheDocument();
    expect(screen.getByText(/no la guardamos/)).toBeInTheDocument(); // la ubicación no se almacena
    expect(screen.getByRole("link", { name: "Términos y Condiciones" })).toHaveAttribute("href", "/terminos");
  });

  it("el pie de página enlaza a ambos documentos", () => {
    dentroDeRouter(<Footer />);
    expect(screen.getByRole("link", { name: /Política de privacidad/ })).toHaveAttribute("href", "/privacidad");
    expect(screen.getByRole("link", { name: "Términos y condiciones" })).toHaveAttribute("href", "/terminos");
  });
});
