import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import ModalProblema from "./ModalProblema";

vi.mock("../../api/client", () => ({ api: { abrirCaso: vi.fn(), configuracion: vi.fn() } }));
vi.mock("../../hooks/useConfiguracion", () => ({ useConfiguracion: () => ({ soporte: { motivos_caso: ["no_presto_servicio", "servicio_diferente", "no_asistio_turista", "otro"], detalle_min: 20, detalle_max: 1000 } }) }));
let mockUsuario = { id: 1, rol: "turista" };
vi.mock("../../context/auth", () => ({ useAuth: () => ({ usuario: mockUsuario }) }));
import { api } from "../../api/client";

const reserva = { id: 7, fecha_servicio: "2031-05-02", codigo: "PT-ABC123", sitio: { nombre: "Cascada La Diabla" } };
const DETALLE = "Llegamos a la hora y el negocio estaba cerrado.";
const opciones = () => screen.getAllByRole("option").map((o) => o.value).filter(Boolean);

describe("ModalProblema", () => {
  beforeEach(() => {
    api.abrirCaso.mockReset();
    mockUsuario = { id: 1, rol: "turista" };
  });

  it("la turista ve los motivos que le corresponden (no puede reportar su propia inasistencia)", () => {
    render(<ModalProblema reserva={reserva} onCerrar={() => {}} />);
    expect(screen.getByRole("dialog", { name: "Tengo un problema con esta reserva" })).toBeInTheDocument();
    expect(screen.getByText(/Cascada La Diabla · 2031-05-02 · PT-ABC123/)).toBeInTheDocument();
    expect(opciones()).toEqual(["no_presto_servicio", "servicio_diferente", "otro"]);
  });

  it("el negocio ve los suyos (no reporta que él mismo no prestó el servicio)", () => {
    mockUsuario = { id: 2, rol: "prestador" };
    render(<ModalProblema reserva={reserva} onCerrar={() => {}} />);
    expect(opciones()).toEqual(["servicio_diferente", "no_asistio_turista", "otro"]);
  });

  it("no deja enviar sin motivo ni con un detalle corto, y al enviar abre el caso y confirma", async () => {
    const caso = { id: 3, estado: "abierto" };
    api.abrirCaso.mockResolvedValue(caso);
    const onAbierto = vi.fn();
    render(<ModalProblema reserva={reserva} onCerrar={() => {}} onAbierto={onAbierto} />);
    const enviar = screen.getByRole("button", { name: "Enviar caso" });
    expect(enviar).toBeDisabled();

    await userEvent.selectOptions(screen.getByRole("combobox"), "no_presto_servicio");
    await userEvent.type(screen.getByRole("textbox"), "muy corto");
    expect(enviar).toBeDisabled();
    expect(screen.getByText(/Mínimo 20 caracteres \(llevas 9\)/)).toBeInTheDocument();

    await userEvent.clear(screen.getByRole("textbox"));
    await userEvent.type(screen.getByRole("textbox"), DETALLE);
    await userEvent.click(enviar);
    expect(api.abrirCaso).toHaveBeenCalledWith({ reserva_id: 7, motivo: "no_presto_servicio", detalle: DETALLE });
    expect(await screen.findByText(/Recibimos tu caso/)).toBeInTheDocument();
    expect(onAbierto).toHaveBeenCalledWith(caso);
  });

  it("muestra el error del servidor y deja el formulario para corregir", async () => {
    api.abrirCaso.mockRejectedValue(new Error("Ya tienes un caso abierto sobre esta reserva."));
    render(<ModalProblema reserva={reserva} onCerrar={() => {}} />);
    await userEvent.selectOptions(screen.getByRole("combobox"), "otro");
    await userEvent.type(screen.getByRole("textbox"), DETALLE);
    await userEvent.click(screen.getByRole("button", { name: "Enviar caso" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("Ya tienes un caso abierto");
    expect(screen.getByRole("button", { name: "Enviar caso" })).toBeInTheDocument();
  });
});
