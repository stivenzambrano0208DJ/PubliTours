import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Routes, Route } from "react-router-dom";
import Registro from "./Registro";

const login = vi.fn();
vi.mock("../context/auth", () => ({ useAuth: () => ({ login }) }));
vi.mock("../api/client", () => ({ api: { registro: vi.fn() } }));
import { api } from "../api/client";

function montar(ruta = "/registro") {
  return render(
    <MemoryRouter initialEntries={[ruta]}>
      <Routes>
        <Route path="/registro" element={<Registro />} />
        <Route path="/" element={<p>Inicio</p>} />
        <Route path="/mi-negocio" element={<p>Portal del prestador</p>} />
      </Routes>
    </MemoryRouter>
  );
}

const aceptarTerminos = () => userEvent.click(screen.getByRole("checkbox", { name: /Acepto los/ }));

const llenarCuenta = async () => {
  await userEvent.type(screen.getByPlaceholderText("Tu nombre completo"), "Ana Pérez");
  await userEvent.type(screen.getByPlaceholderText("correo@dominio.com"), "ana@test.com");
  await userEvent.type(screen.getByPlaceholderText("Mínimo 8 caracteres"), "clave12345");
};

describe("Registro", () => {
  beforeEach(() => { api.registro.mockReset(); login.mockReset(); });

  it("un turista solo ve los datos de cuenta, sin datos de negocio", () => {
    montar();
    expect(screen.queryByRole("group", { name: "Datos de tu negocio" })).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Registrarme/ })).toBeInTheDocument();
  });

  it("al elegir Prestador aparecen los datos del negocio", async () => {
    montar();
    await userEvent.click(screen.getByRole("button", { name: /Prestador$/ }));
    expect(screen.getByRole("group", { name: "Datos de tu negocio" })).toBeInTheDocument();
    expect(screen.getByLabelText("Nombre del negocio")).toBeInTheDocument();
    expect(screen.getByLabelText("Municipio de operación")).toBeInTheDocument();
    expect(screen.getByRole("radio", { name: /Hospedaje \/ Glamping/ })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Registrar mi negocio/ })).toBeInTheDocument();
  });

  it("el orden es: rol, datos de la cuenta, datos del negocio y al final el envío", () => {
    montar("/registro?rol=prestador");
    const antes = (x, y) => Boolean(x.compareDocumentPosition(y) & Node.DOCUMENT_POSITION_FOLLOWING);
    const rol = screen.getByRole("button", { name: "Turista" });
    const nombre = screen.getByPlaceholderText("Tu nombre completo");
    const correo = screen.getByPlaceholderText("correo@dominio.com");
    const clave = screen.getByPlaceholderText("Mínimo 8 caracteres");
    const negocio = screen.getByLabelText("Nombre del negocio");
    const enviar = screen.getByRole("button", { name: /Registrar mi negocio/ });

    expect(antes(rol, nombre)).toBe(true);
    expect(antes(nombre, correo)).toBe(true);
    expect(antes(correo, clave)).toBe(true);
    expect(antes(clave, negocio)).toBe(true);
    expect(antes(negocio, enviar)).toBe(true);
  });

  it("la pantalla de alto fijo contiene a los controles ocultos: sin \"relative\" la página entera se desplaza y deja una franja en blanco", () => {
    const { container } = montar("/registro?rol=prestador");
    const raiz = container.firstElementChild;
    const clases = raiz.className.split(" ");
    expect(clases).toContain("overflow-hidden");
    expect(clases).toContain("relative");
    // El panel del formulario (el que hace scroll) también debe ser contenedor: si no, al elegir una categoría el navegador
    // desplaza la caja entera para mostrar el botón de opción oculto y el formulario "salta" hacia abajo.
    const panel = raiz.querySelector("main.overflow-y-auto");
    expect(panel.className.split(" ")).toContain("relative");
  });

  it("entrando con ?rol=prestador ya muestra los datos del negocio", () => {
    montar("/registro?rol=prestador");
    expect(screen.getByRole("group", { name: "Datos de tu negocio" })).toBeInTheDocument();
  });

  it("el turista se registra sin enviar datos de negocio y va al inicio", async () => {
    api.registro.mockResolvedValue({ token: "t", usuario: { id: 1, rol: "turista" } });
    montar();
    await llenarCuenta();
    await aceptarTerminos();
    await userEvent.click(screen.getByRole("button", { name: /Registrarme/ }));

    expect(api.registro).toHaveBeenCalledWith({ nombre: "Ana Pérez", correo: "ana@test.com", password: "clave12345", rol: "turista", acepta_terminos: true });
    expect(await screen.findByText("Inicio")).toBeInTheDocument();
  });

  it("el prestador envía cuenta y negocio juntos y va al portal", async () => {
    api.registro.mockResolvedValue({ token: "t", usuario: { id: 2, rol: "prestador" }, prestador: { id: 1 } });
    montar();
    await userEvent.click(screen.getByRole("button", { name: /Prestador$/ }));
    await llenarCuenta();
    await userEvent.type(screen.getByLabelText("Nombre del negocio"), "Finca El Paraíso");
    await userEvent.click(screen.getByRole("radio", { name: /Hospedaje \/ Glamping/ }));
    await userEvent.selectOptions(screen.getByLabelText("Municipio de operación"), "Florencia");
    await aceptarTerminos();
    await userEvent.click(screen.getByRole("button", { name: /Registrar mi negocio/ }));

    expect(api.registro).toHaveBeenCalledWith(expect.objectContaining({
      rol: "prestador",
      negocio: { nombre_negocio: "Finca El Paraíso", categoria: "Hospedaje", municipio: "Florencia" }, // lo demás se completa en el portal
    }));
    expect(await screen.findByText("Portal del prestador")).toBeInTheDocument();
  });

  it("sin aceptar los términos no se envía el registro", async () => {
    montar();
    await llenarCuenta();
    expect(screen.getByRole("checkbox", { name: /Acepto los/ })).not.toBeChecked();
    await userEvent.click(screen.getByRole("button", { name: /Registrarme/ }));
    expect(api.registro).not.toHaveBeenCalled();
  });

  it("los términos y la privacidad se abren desde el registro", () => {
    montar();
    expect(screen.getByRole("link", { name: "Términos y Condiciones" })).toHaveAttribute("href", "/terminos");
    expect(screen.getByRole("link", { name: "Política de Privacidad" })).toHaveAttribute("href", "/privacidad");
  });

  it("si el servidor rechaza el registro muestra el error y no navega", async () => {
    api.registro.mockRejectedValue(new Error("El correo ya está registrado."));
    montar();
    await llenarCuenta();
    await aceptarTerminos();
    await userEvent.click(screen.getByRole("button", { name: /Registrarme/ }));
    expect(await screen.findByText("El correo ya está registrado.")).toBeInTheDocument();
    expect(screen.queryByText("Inicio")).not.toBeInTheDocument();
  });
});
