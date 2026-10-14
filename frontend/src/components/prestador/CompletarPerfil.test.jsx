import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import CompletarPerfil from "./CompletarPerfil";

vi.mock("../../api/client", () => ({ api: { actualizarPerfilPrestador: vi.fn(), enviarRevisionPrestador: vi.fn() } }));
import { api } from "../../api/client";

const perfilBase = { id: 4, nombre_negocio: "Finca El Paraíso", categoria: "Hospedaje", municipio: "Florencia", estado_verificacion: "incompleto", descripcion: null, telefono: null, direccion: null, redes: null };
const DESCRIPCION = "Finca de hospedaje rodeada de naturaleza, con cabañas y senderos.";

const montar = (perfil = perfilBase, onActualizado = () => {}) => render(<CompletarPerfil perfil={perfil} onActualizado={onActualizado} />);
const botonEnviar = () => screen.getByRole("button", { name: /Enviar (de nuevo )?a revisión/ });

describe("CompletarPerfil", () => {
  beforeEach(() => { api.actualizarPerfilPrestador.mockReset(); api.enviarRevisionPrestador.mockReset(); });

  it("muestra el avance y no deja enviar mientras falte algo", () => {
    montar();
    expect(screen.getByText("1/4")).toBeInTheDocument(); // solo los datos básicos
    expect(botonEnviar()).toBeDisabled();
  });

  it("el avance y el botón se actualizan al completar cada requisito", async () => {
    montar();
    await userEvent.type(screen.getByPlaceholderText(/Cuéntale al turista/), "corta");
    expect(screen.getByText("1/4")).toBeInTheDocument(); // menos de 30 caracteres no cuenta
    await userEvent.clear(screen.getByPlaceholderText(/Cuéntale al turista/));
    await userEvent.type(screen.getByPlaceholderText(/Cuéntale al turista/), DESCRIPCION);
    expect(screen.getByText("2/4")).toBeInTheDocument();

    await userEvent.type(screen.getByPlaceholderText("Ej. 3001234567"), "300 123-4567"); // solo deja dígitos
    expect(screen.getByText("3/4")).toBeInTheDocument();
    await userEvent.type(screen.getByPlaceholderText(/Vereda El Caraño/), "Vereda El Caraño, km 4");
    expect(screen.getByText("4/4")).toBeInTheDocument();
    expect(botonEnviar()).toBeEnabled();
  });

  it("guardar borrador actualiza el perfil sin enviarlo a revisión", async () => {
    api.actualizarPerfilPrestador.mockResolvedValue({ ...perfilBase, descripcion: DESCRIPCION });
    const onActualizado = vi.fn();
    montar(perfilBase, onActualizado);
    await userEvent.type(screen.getByPlaceholderText(/Cuéntale al turista/), DESCRIPCION);
    await userEvent.click(screen.getByRole("button", { name: "Guardar borrador" }));

    expect(api.actualizarPerfilPrestador).toHaveBeenCalledWith(4, expect.objectContaining({ descripcion: DESCRIPCION }));
    expect(api.enviarRevisionPrestador).not.toHaveBeenCalled();
    expect(await screen.findByText("Borrador guardado.")).toBeInTheDocument();
    expect(onActualizado).toHaveBeenCalled();
  });

  it("con todo completo guarda y envía a revisión", async () => {
    const completo = { ...perfilBase, descripcion: DESCRIPCION, telefono: "3001234567", direccion: "Vereda El Caraño, km 4", redes: "" };
    api.actualizarPerfilPrestador.mockResolvedValue(completo);
    api.enviarRevisionPrestador.mockResolvedValue({ ...completo, estado_verificacion: "pendiente" });
    const onActualizado = vi.fn();
    montar(completo, onActualizado);

    await userEvent.click(botonEnviar());
    expect(api.actualizarPerfilPrestador).toHaveBeenCalledWith(4, expect.objectContaining({ telefono: "3001234567" }));
    expect(api.enviarRevisionPrestador).toHaveBeenCalledWith(4);
    expect(onActualizado).toHaveBeenLastCalledWith(expect.objectContaining({ estado_verificacion: "pendiente" }));
  });

  it("si el servidor rechaza el envío muestra el motivo y permite reintentar", async () => {
    const completo = { ...perfilBase, descripcion: DESCRIPCION, telefono: "3001234567", direccion: "Vereda El Caraño, km 4" };
    api.actualizarPerfilPrestador.mockResolvedValue(completo);
    api.enviarRevisionPrestador.mockImplementation(() => Promise.reject(new Error("Antes de enviarlo a revisión te falta: la dirección o cómo llegar.")));
    montar(completo);
    await userEvent.click(botonEnviar());
    expect(await screen.findByText(/te falta: la dirección/)).toBeInTheDocument();
    expect(botonEnviar()).toBeEnabled();
  });

  it("un perfil rechazado muestra el motivo y ofrece reenviarlo", () => {
    montar({ ...perfilBase, estado_verificacion: "rechazado", motivo_rechazo: "Falta información de contacto", descripcion: DESCRIPCION, telefono: "3001234567", direccion: "Calle 5 # 3-20" });
    expect(screen.getByText(/Falta información de contacto/)).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: /Corrige y vuelve a enviar/ })).toBeInTheDocument();
    expect(botonEnviar()).toBeEnabled();
    expect(botonEnviar()).toHaveTextContent("Enviar de nuevo a revisión");
  });
});
