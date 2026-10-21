import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, act } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { AvisosProvider } from "./AvisosContext";
import { useAvisos } from "./avisos";

// Pequeña pantalla de prueba que usa el sistema como lo hacen los componentes reales.
function Pantalla({ onRespuesta = () => {}, opciones }) {
  const { avisar, confirmar } = useAvisos();
  return (
    <div>
      <button onClick={() => avisar("No se pudo guardar")}>fallar</button>
      <button onClick={() => avisar("Enlace copiado", "ok")}>copiar</button>
      <button onClick={() => confirmar("¿Eliminar el servicio?", opciones).then(onRespuesta)}>eliminar</button>
      <button onClick={() => confirmar("Otra pregunta").then(onRespuesta)}>otra</button>
    </div>
  );
}
const montar = (props) => render(<AvisosProvider><Pantalla {...props} /></AvisosProvider>);

describe("avisos", () => {
  afterEach(() => { vi.useRealTimers(); });

  it("un error se anuncia como alerta y un aviso correcto como estado, sin bloquear la página", async () => {
    montar();
    await userEvent.click(screen.getByRole("button", { name: "fallar" }));
    expect(screen.getByRole("alert")).toHaveTextContent("No se pudo guardar");
    await userEvent.click(screen.getByRole("button", { name: "copiar" }));
    expect(screen.getByRole("status")).toHaveTextContent("Enlace copiado");
    expect(screen.getByRole("button", { name: "fallar" })).toBeEnabled(); // la página sigue usable
  });

  it("se cierra solo pasado un rato, o al pulsar cerrar", async () => {
    vi.useFakeTimers();
    montar();
    act(() => screen.getByRole("button", { name: "copiar" }).click());
    expect(screen.getByRole("status")).toBeInTheDocument();
    await act(() => vi.advanceTimersByTimeAsync(5100));
    expect(screen.queryByRole("status")).toBeNull();

    act(() => screen.getByRole("button", { name: "fallar" }).click());
    act(() => screen.getByRole("button", { name: "Cerrar aviso" }).click());
    expect(screen.queryByRole("alert")).toBeNull();
  });

  it("muestra como máximo tres avisos a la vez: los más antiguos se descartan", async () => {
    montar();
    for (let i = 0; i < 5; i++) await userEvent.click(screen.getByRole("button", { name: "fallar" }));
    expect(screen.getAllByRole("alert")).toHaveLength(3);
  });

  it("sin proveedor usa los diálogos del navegador, para que nada se rompa", async () => {
    const alerta = vi.spyOn(window, "alert").mockImplementation(() => {});
    render(<Pantalla />);
    await userEvent.click(screen.getByRole("button", { name: "fallar" }));
    expect(alerta).toHaveBeenCalledWith("No se pudo guardar");
    alerta.mockRestore();
  });
});

describe("confirmaciones", () => {
  it("Confirmar responde true y cierra la ventana", async () => {
    const respuesta = vi.fn();
    montar({ onRespuesta: respuesta, opciones: { titulo: "Eliminar servicio", confirmar: "Eliminar", peligro: true } });
    await userEvent.click(screen.getByRole("button", { name: "eliminar" }));

    const dialogo = screen.getByRole("alertdialog", { name: "Eliminar servicio" });
    expect(dialogo).toHaveTextContent("¿Eliminar el servicio?");
    await userEvent.click(screen.getByRole("button", { name: "Eliminar" }));
    expect(respuesta).toHaveBeenCalledWith(true);
    expect(screen.queryByRole("alertdialog")).toBeNull();
  });

  it("Cancelar, Escape y tocar fuera responden false", async () => {
    const respuesta = vi.fn();
    montar({ onRespuesta: respuesta });
    for (const cancelar of [
      () => userEvent.click(screen.getByRole("button", { name: "Cancelar" })),
      () => userEvent.keyboard("{Escape}"),
      () => userEvent.click(screen.getByRole("alertdialog").parentElement), // el fondo oscuro
    ]) {
      await userEvent.click(screen.getByRole("button", { name: "eliminar" }));
      await cancelar();
      expect(screen.queryByRole("alertdialog")).toBeNull();
    }
    expect(respuesta.mock.calls).toEqual([[false], [false], [false]]);
  });

  it("el foco empieza en Cancelar (lo más seguro) y vuelve al botón que la abrió", async () => {
    montar();
    const abrir = screen.getByRole("button", { name: "eliminar" });
    await userEvent.click(abrir);
    expect(screen.getByRole("button", { name: "Cancelar" })).toHaveFocus();
    await userEvent.keyboard("{Escape}");
    expect(abrir).toHaveFocus();
  });

  it("Tab no sale de la ventana: da la vuelta entre sus dos botones", async () => {
    montar();
    await userEvent.click(screen.getByRole("button", { name: "eliminar" }));
    expect(screen.getByRole("button", { name: "Cancelar" })).toHaveFocus();
    await userEvent.tab();
    expect(screen.getByRole("button", { name: "Confirmar" })).toHaveFocus();
    await userEvent.tab();
    expect(screen.getByRole("button", { name: "Cancelar" })).toHaveFocus();
    await userEvent.tab({ shift: true });
    expect(screen.getByRole("button", { name: "Confirmar" })).toHaveFocus();
  });

  it("si se abre otra pregunta mientras hay una, la anterior queda cancelada", async () => {
    const respuesta = vi.fn();
    montar({ onRespuesta: respuesta });
    act(() => screen.getByRole("button", { name: "eliminar" }).click());
    act(() => screen.getByRole("button", { name: "otra" }).click());
    await act(async () => {});
    expect(respuesta).toHaveBeenCalledWith(false); // la primera
    expect(screen.getByRole("alertdialog")).toHaveTextContent("Otra pregunta");
  });

  it("la acción peligrosa se distingue con el color de error", async () => {
    montar({ opciones: { confirmar: "Eliminar", peligro: true } });
    await userEvent.click(screen.getByRole("button", { name: "eliminar" }));
    expect(screen.getByRole("button", { name: "Eliminar" }).className).toContain("bg-error");
  });
});
