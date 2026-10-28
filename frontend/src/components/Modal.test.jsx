import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useState } from "react";
import Modal from "./Modal";

function Pantalla({ onCerrar = () => {}, ...props }) {
  const [abierto, setAbierto] = useState(false);
  return (
    <>
      <button onClick={() => setAbierto(true)}>Abrir</button>
      {abierto && (
        <Modal etiqueta="Prueba" onCerrar={() => { onCerrar(); setAbierto(false); }} {...props}>
          <button>Primero</button>
          <button>Último</button>
        </Modal>
      )}
    </>
  );
}

describe("Modal", () => {
  it("es un diálogo modal con nombre accesible", () => {
    render(<Modal etiqueta="Editar reserva"><p>Hola</p></Modal>);
    const dialogo = screen.getByRole("dialog", { name: "Editar reserva" });
    expect(dialogo).toHaveAttribute("aria-modal", "true");
  });

  it("toma el nombre del título que ya muestra la ventana", () => {
    render(<Modal tituloId="t"><h3 id="t">Reportar mensaje</h3></Modal>);
    expect(screen.getByRole("dialog", { name: "Reportar mensaje" })).toBeInTheDocument();
  });

  it("Escape la cierra, y no lo hace si se desactiva", async () => {
    const onCerrar = vi.fn();
    const { rerender } = render(<Modal etiqueta="x" onCerrar={onCerrar}><button>a</button></Modal>);
    await userEvent.keyboard("{Escape}");
    expect(onCerrar).toHaveBeenCalledTimes(1);
    rerender(<Modal etiqueta="x" onCerrar={onCerrar} cerrarConEscape={false}><button>a</button></Modal>);
    await userEvent.keyboard("{Escape}");
    expect(onCerrar).toHaveBeenCalledTimes(1);
  });

  it("Escape deja de cerrarla cuando la persona ya escribió algo", async () => {
    const onCerrar = vi.fn();
    render(<Modal etiqueta="x" onCerrar={onCerrar}><input aria-label="campo" /></Modal>);
    await userEvent.type(screen.getByLabelText("campo"), "hola");
    await userEvent.keyboard("{Escape}");
    expect(onCerrar).not.toHaveBeenCalled();
  });

  it("el fondo la cierra, pero pulsar dentro del panel no; y puede desactivarse", async () => {
    const onCerrar = vi.fn();
    const { container, rerender } = render(<Modal etiqueta="x" onCerrar={onCerrar}><button>a</button></Modal>);
    await userEvent.click(screen.getByRole("button", { name: "a" }));
    await userEvent.click(screen.getByRole("dialog"));
    expect(onCerrar).not.toHaveBeenCalled();
    await userEvent.click(container.firstChild);
    expect(onCerrar).toHaveBeenCalledTimes(1);
    rerender(<Modal etiqueta="x" onCerrar={onCerrar} cerrarAlPulsarFondo={false}><button>a</button></Modal>);
    await userEvent.click(container.firstChild);
    expect(onCerrar).toHaveBeenCalledTimes(1);
  });

  it("al abrir enfoca el primer control y al cerrar devuelve el foco a quien la abrió", async () => {
    render(<Pantalla />);
    const abrir = screen.getByRole("button", { name: "Abrir" });
    await userEvent.click(abrir);
    expect(screen.getByRole("button", { name: "Primero" })).toHaveFocus();
    await userEvent.keyboard("{Escape}");
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(abrir).toHaveFocus();
  });

  it("devuelve el foco a quien la abrió aunque un campo con autoFocus lo haya movido al abrir", async () => {
    function ConCampo() {
      const [abierto, setAbierto] = useState(false);
      return <><button onClick={() => setAbierto(true)}>Abrir</button>{abierto && <Modal etiqueta="x" onCerrar={() => setAbierto(false)}><input aria-label="campo" autoFocus /></Modal>}</>;
    }
    render(<ConCampo />);
    await userEvent.click(screen.getByRole("button", { name: "Abrir" }));
    expect(screen.getByLabelText("campo")).toHaveFocus();
    await userEvent.keyboard("{Escape}");
    expect(screen.getByRole("button", { name: "Abrir" })).toHaveFocus();
  });

  it("respeta el campo que la ventana ya enfocó por su cuenta", () => {
    render(<Modal etiqueta="x"><button>a</button><input aria-label="campo" autoFocus /></Modal>);
    expect(screen.getByLabelText("campo")).toHaveFocus();
  });

  it("el foco no sale de la ventana con Tab ni con Mayús+Tab", async () => {
    render(<Pantalla />);
    await userEvent.click(screen.getByRole("button", { name: "Abrir" }));
    await userEvent.tab({ shift: true });
    expect(screen.getByRole("button", { name: "Último" })).toHaveFocus();
    await userEvent.tab();
    expect(screen.getByRole("button", { name: "Primero" })).toHaveFocus();
  });

  it("con varias abiertas, Escape solo cierra la de arriba", async () => {
    const fondo = vi.fn(), arriba = vi.fn();
    render(<><Modal etiqueta="debajo" onCerrar={fondo}><button>a</button></Modal><Modal etiqueta="encima" onCerrar={arriba}><button>b</button></Modal></>);
    await userEvent.keyboard("{Escape}");
    expect(arriba).toHaveBeenCalledTimes(1);
    expect(fondo).not.toHaveBeenCalled();
  });

  it("bloquea el desplazamiento de la página mientras está abierta y lo restaura al cerrar", () => {
    document.body.style.overflow = "auto";
    const { unmount } = render(<Modal etiqueta="x"><button>a</button></Modal>);
    expect(document.body.style.overflow).toBe("hidden");
    unmount();
    expect(document.body.style.overflow).toBe("auto");
    document.body.style.overflow = "";
  });

  it("puede ser un formulario y entrega sus propiedades al panel", async () => {
    const onSubmit = vi.fn((e) => e.preventDefault());
    render(<Modal etiqueta="x" as="form" onSubmit={onSubmit} className="panel"><button type="submit">Enviar</button></Modal>);
    expect(screen.getByRole("dialog").tagName).toBe("FORM");
    await userEvent.click(screen.getByRole("button", { name: "Enviar" }));
    expect(onSubmit).toHaveBeenCalledTimes(1);
  });
});
