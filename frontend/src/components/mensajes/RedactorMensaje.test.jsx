import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor, fireEvent } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import RedactorMensaje from "./RedactorMensaje";

const mockConfig = { mensajeria: { texto_max: 100, fotos_max: 2, foto_max_mb: 1, motivos_reporte: [] } };
let config = mockConfig;
vi.mock("../../hooks/useConfiguracion", () => ({ useConfiguracion: () => config }));

const png = (nombre = "a.png", mb = 0.01) => new File([new Uint8Array(Math.round(mb * 1024 * 1024))], nombre, { type: "image/png" });
const escribir = (texto) => userEvent.type(screen.getByLabelText("Escribe tu mensaje"), texto);
const montar = (props = {}) => {
  const onEnviar = props.onEnviar || vi.fn().mockResolvedValue();
  render(<RedactorMensaje onEnviar={onEnviar} {...props} />);
  return onEnviar;
};

describe("RedactorMensaje", () => {
  beforeEach(() => {
    config = mockConfig;
    let n = 0;
    URL.createObjectURL = vi.fn(() => `blob:prueba-${n++}`);
    URL.revokeObjectURL = vi.fn();
  });

  it("no se puede enviar vacío ni solo con espacios", async () => {
    montar();
    const enviar = screen.getByRole("button", { name: /Enviar/ });
    expect(enviar).toBeDisabled();
    await escribir("    ");
    expect(enviar).toBeDisabled();
    await escribir("hola");
    expect(enviar).toBeEnabled();
  });

  it("envía el texto sin espacios sobrantes y se limpia al terminar", async () => {
    const onEnviar = montar();
    await escribir("  ¿Hay parqueadero?  ");
    await userEvent.click(screen.getByRole("button", { name: /Enviar/ }));
    expect(onEnviar).toHaveBeenCalledWith("¿Hay parqueadero?", []);
    await waitFor(() => expect(screen.getByLabelText("Escribe tu mensaje")).toHaveValue(""));
  });

  it("si el envío falla muestra el motivo y conserva lo escrito y las fotos", async () => {
    const onEnviar = montar({ onEnviar: vi.fn().mockRejectedValue(new Error("Verifica tu correo para continuar.")) });
    await escribir("Mi pregunta");
    fireEvent.change(screen.getByTestId("selector-fotos"), { target: { files: [png()] } });
    await userEvent.click(screen.getByRole("button", { name: /Enviar/ }));
    expect(await screen.findByRole("alert")).toHaveTextContent("Verifica tu correo para continuar.");
    expect(screen.getByLabelText("Escribe tu mensaje")).toHaveValue("Mi pregunta");
    expect(screen.getByAltText("Foto 1 para enviar")).toBeInTheDocument();
    expect(onEnviar).toHaveBeenCalledTimes(1);
  });

  it("Ctrl + Enter envía y un Enter solo no", async () => {
    const onEnviar = montar();
    await escribir("Hola");
    await userEvent.keyboard("{Enter}");
    expect(onEnviar).not.toHaveBeenCalled();
    await userEvent.keyboard("{Control>}{Enter}{/Control}");
    expect(onEnviar).toHaveBeenCalledWith("Hola", []); // el Enter solo dejó un salto de línea, que se recorta al enviar
  });

  it("permite enviar solo fotos y muestra una vista previa de cada una con opción de quitarla", async () => {
    const onEnviar = montar();
    const [a, b] = [png("a.png"), png("b.png")];
    fireEvent.change(screen.getByTestId("selector-fotos"), { target: { files: [a, b] } });
    expect(screen.getByAltText("Foto 1 para enviar")).toBeInTheDocument();
    expect(screen.getByAltText("Foto 2 para enviar")).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "Quitar foto 1" }));
    expect(screen.queryByAltText("Foto 2 para enviar")).toBeNull();
    await userEvent.click(screen.getByRole("button", { name: /Enviar/ }));
    expect(onEnviar).toHaveBeenCalledWith("", [b]);
  });

  it("rechaza fotos que no son imagen, que pesan de más o que pasan del máximo, y lo explica", async () => {
    montar();
    const selector = screen.getByTestId("selector-fotos");
    fireEvent.change(selector, { target: { files: [new File(["x"], "doc.pdf", { type: "application/pdf" })] } });
    expect(screen.getByRole("alert")).toHaveTextContent("Solo se aceptan fotos JPG, PNG, WEBP o GIF.");
    fireEvent.change(selector, { target: { files: [png("grande.png", 1.5)] } });
    expect(screen.getByRole("alert")).toHaveTextContent("Cada foto puede pesar hasta 1 MB.");
    expect(screen.queryByAltText(/para enviar/)).toBeNull();
    fireEvent.change(selector, { target: { files: [png("1.png"), png("2.png"), png("3.png")] } });
    expect(screen.getByRole("alert")).toHaveTextContent("Puedes adjuntar hasta 2 fotos por mensaje.");
    expect(screen.getAllByAltText(/para enviar/)).toHaveLength(2);
    expect(screen.getByRole("button", { name: "Adjuntar foto" })).toBeDisabled(); // ya no caben más
  });

  it("usa los topes del servidor: largo máximo del texto y contador cuando se acerca", async () => {
    montar();
    const caja = screen.getByLabelText("Escribe tu mensaje");
    expect(caja).toHaveAttribute("maxlength", "100");
    await escribir("a".repeat(70));
    expect(screen.queryByText("70/100")).toBeNull();
    await escribir("a".repeat(15));
    expect(screen.getByText("85/100")).toBeInTheDocument();
  });

  it("mientras no llegan los topes del servidor no ofrece adjuntar fotos (no inventa cifras)", () => {
    config = null;
    montar();
    expect(screen.getByRole("button", { name: "Adjuntar foto" })).toBeDisabled();
    expect(screen.getByLabelText("Escribe tu mensaje")).not.toHaveAttribute("maxlength");
  });

  it("deshabilitado no deja escribir ni enviar", () => {
    montar({ deshabilitado: true });
    expect(screen.getByLabelText("Escribe tu mensaje")).toBeDisabled();
    expect(screen.getByRole("button", { name: /Enviar/ })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Adjuntar foto" })).toBeDisabled();
  });

  it("libera las vistas previas al quitar las fotos", async () => {
    montar();
    fireEvent.change(screen.getByTestId("selector-fotos"), { target: { files: [png()] } });
    await userEvent.click(screen.getByRole("button", { name: "Quitar foto 1" }));
    expect(URL.revokeObjectURL).toHaveBeenCalled();
  });
});
