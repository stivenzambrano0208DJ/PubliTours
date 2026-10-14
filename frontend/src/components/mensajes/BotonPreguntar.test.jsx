import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor, fireEvent } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Routes, Route } from "react-router-dom";
import BotonPreguntar from "./BotonPreguntar";

const mockAuth = { usuario: null };
vi.mock("../../context/auth", () => ({ useAuth: () => mockAuth }));
vi.mock("../../api/client", async (original) => ({ ...(await original()), api: { iniciarConversacion: vi.fn(), configuracion: vi.fn() } }));
import { api } from "../../api/client";

const CONFIG = { mensajeria: { texto_max: 1500, fotos_max: 3, foto_max_mb: 5, motivos_reporte: [] } };
const montar = (props = { tema: { sitio_id: 7 }, nombre: "Cascada La Diabla" }) => render(
  <MemoryRouter initialEntries={["/sitios/7"]}>
    <Routes>
      <Route path="/sitios/7" element={<BotonPreguntar {...props} />} />
      <Route path="/mensajes/:id" element={<p>Bandeja de mensajes</p>} />
      <Route path="/login" element={<p>Pantalla de login</p>} />
    </Routes>
  </MemoryRouter>
);

describe("BotonPreguntar", () => {
  beforeEach(() => {
    mockAuth.usuario = { id: 1, nombre: "Ana", rol: "turista" };
    api.iniciarConversacion.mockReset();
    api.configuracion.mockReset().mockResolvedValue(CONFIG);
    URL.createObjectURL = vi.fn(() => "blob:x");
    URL.revokeObjectURL = vi.fn();
  });

  it("sin sesión invita a iniciarla en vez de abrir la ventana", async () => {
    mockAuth.usuario = null;
    montar();
    await userEvent.click(screen.getByRole("link", { name: /Inicia sesión para preguntar/ }));
    expect(screen.getByText("Pantalla de login")).toBeInTheDocument();
  });

  it("la administración no participa en conversaciones: el botón no aparece", () => {
    mockAuth.usuario = { id: 9, nombre: "Admin", rol: "administrador" };
    montar();
    expect(screen.queryByRole("button")).toBeNull();
    expect(screen.queryByRole("link")).toBeNull();
  });

  it("abre una ventana que explica a quién le llega el mensaje y se puede cerrar", async () => {
    montar();
    await userEvent.click(screen.getByRole("button", { name: "Preguntar al negocio" }));
    const ventana = screen.getByRole("dialog", { name: "Preguntar al negocio" });
    expect(ventana).toHaveTextContent("sobre «Cascada La Diabla»");
    expect(ventana).toHaveTextContent("Nunca compartas contraseñas");
    await userEvent.click(screen.getByRole("button", { name: "Cerrar" }));
    expect(screen.queryByRole("dialog")).toBeNull();
  });

  it("envía la pregunta con su tema y lleva a la conversación", async () => {
    api.iniciarConversacion.mockResolvedValue({ conversacion_id: 42, mensaje: { id: 1 } });
    montar();
    await userEvent.click(screen.getByRole("button", { name: "Preguntar al negocio" }));
    await userEvent.type(screen.getByLabelText("Escribe tu mensaje"), "¿Hay parqueadero?");
    await userEvent.click(screen.getByRole("button", { name: /Enviar/ }));
    expect(api.iniciarConversacion).toHaveBeenCalledWith({ sitio_id: 7, texto: "¿Hay parqueadero?" }, []);
    expect(await screen.findByText("Bandeja de mensajes")).toBeInTheDocument();
  });

  it("puede adjuntar fotos y las manda junto con la pregunta", async () => {
    api.iniciarConversacion.mockResolvedValue({ conversacion_id: 8, mensaje: { id: 1 } });
    montar();
    await userEvent.click(screen.getByRole("button", { name: "Preguntar al negocio" }));
    const foto = new File(["x"], "camino.png", { type: "image/png" });
    await waitFor(() => expect(screen.getByRole("button", { name: "Adjuntar foto" })).toBeEnabled());
    fireEvent.change(screen.getByTestId("selector-fotos"), { target: { files: [foto] } });
    await userEvent.click(screen.getByRole("button", { name: /Enviar/ }));
    expect(api.iniciarConversacion).toHaveBeenCalledWith({ sitio_id: 7, texto: "" }, [foto]);
  });

  it("si el servidor la rechaza (correo sin verificar, límite…) muestra el motivo y no navega", async () => {
    api.iniciarConversacion.mockRejectedValue(new Error("Verifica tu correo para continuar. Te enviamos un código de 6 dígitos cuando te registraste."));
    montar();
    await userEvent.click(screen.getByRole("button", { name: "Preguntar al negocio" }));
    await userEvent.type(screen.getByLabelText("Escribe tu mensaje"), "Hola");
    await userEvent.click(screen.getByRole("button", { name: /Enviar/ }));
    expect(await screen.findByRole("alert")).toHaveTextContent("Verifica tu correo para continuar");
    expect(screen.queryByText("Bandeja de mensajes")).toBeNull();
    expect(screen.getByRole("dialog")).toBeInTheDocument(); // la ventana sigue abierta con lo escrito
    expect(screen.getByLabelText("Escribe tu mensaje")).toHaveValue("Hola");
  });

  it("sirve para paquetes y para reservas con su propia etiqueta", async () => {
    montar({ tema: { reserva_id: 3 }, etiqueta: "Escribir al negocio", nombre: "Cascada" });
    expect(screen.getByRole("button", { name: "Escribir al negocio" })).toBeInTheDocument();
    api.iniciarConversacion.mockResolvedValue({ conversacion_id: 5 });
    await userEvent.click(screen.getByRole("button", { name: "Escribir al negocio" }));
    await userEvent.type(screen.getByLabelText("Escribe tu mensaje"), "Hola");
    await userEvent.click(screen.getByRole("button", { name: /Enviar/ }));
    expect(api.iniciarConversacion).toHaveBeenCalledWith({ reserva_id: 3, texto: "Hola" }, []);
  });
});
