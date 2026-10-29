import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import CasosAdmin from "./CasosAdmin";

vi.mock("../../api/client", () => ({ api: { casosAdmin: vi.fn(), atenderCasoAdmin: vi.fn() } }));
import { api } from "../../api/client";

const caso = (extra = {}) => ({
  id: 4, reserva_id: 9, codigo: "PT-XYZ789", servicio: "Cascada La Diabla", fecha_servicio: "2031-05-02", estado_reserva: "confirmada",
  motivo: "no_presto_servicio", detalle: "El negocio estaba cerrado.", estado: "abierto", respuesta: null, creado_en: "2031-05-02T15:00:00Z",
  abierto_por: { nombre: "Laura Gómez", rol: "turista" }, turista: "Laura Gómez", negocio: "Finca La Esperanza", ...extra,
});

describe("CasosAdmin", () => {
  beforeEach(() => {
    api.casosAdmin.mockReset().mockResolvedValue([caso()]);
    api.atenderCasoAdmin.mockReset().mockResolvedValue({});
  });

  it("muestra el caso con la reserva, quién lo abrió y lo que contó", async () => {
    render(<CasosAdmin />);
    expect(await screen.findByText("El negocio estaba cerrado.")).toBeInTheDocument();
    expect(screen.getByText("El negocio no prestó el servicio o no se presentó")).toBeInTheDocument();
    expect(screen.getByText(/reserva PT-XYZ789 \(confirmada\)/)).toBeInTheDocument();
    expect(screen.getByText("Lo abrió la turista: Laura Gómez")).toBeInTheDocument();
    expect(api.casosAdmin).toHaveBeenCalledWith("abierto");
  });

  it("resolver exige la respuesta y la envía; luego recarga la lista", async () => {
    render(<CasosAdmin />);
    await userEvent.click(await screen.findByRole("button", { name: "Resolver" }));
    const respuesta = screen.getByRole("textbox");
    expect(respuesta).toBeRequired();
    await userEvent.type(respuesta, "Hablamos con el negocio y reprogramó la visita.");
    await userEvent.click(screen.getByRole("button", { name: "Resolver caso" }));
    expect(api.atenderCasoAdmin).toHaveBeenCalledWith(4, { estado: "resuelto", respuesta: "Hablamos con el negocio y reprogramó la visita." });
    expect(api.casosAdmin).toHaveBeenCalledTimes(2);
  });

  it("poner en revisión permite enviar sin nota", async () => {
    render(<CasosAdmin />);
    await userEvent.click(await screen.findByRole("button", { name: "Poner en revisión" }));
    await userEvent.click(within(screen.getByRole("dialog")).getByRole("button", { name: "Poner en revisión" }));
    expect(api.atenderCasoAdmin).toHaveBeenCalledWith(4, { estado: "en_revision", respuesta: undefined });
  });

  it("cambia de estado con los filtros y un caso resuelto ya no tiene acciones", async () => {
    render(<CasosAdmin />);
    await screen.findByText("El negocio estaba cerrado.");
    api.casosAdmin.mockResolvedValue([caso({ estado: "resuelto", respuesta: "Listo." })]);
    await userEvent.click(screen.getByRole("button", { name: "Resuelto" }));
    expect(await screen.findByText("Respuesta enviada")).toBeInTheDocument();
    expect(api.casosAdmin).toHaveBeenLastCalledWith("resuelto");
    expect(screen.queryByRole("button", { name: "Resolver" })).not.toBeInTheDocument();
  });
});
