import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useState } from "react";
import CamposReserva from "./CamposReserva";

vi.mock("../../api/client", () => ({ api: { fechasBloqueadas: vi.fn() } }));
import { api } from "../../api/client";

const sitio = { id: 7, precio: "50000", capacidad: 10 };

function Contenedor({ inicial }) {
  const [valores, setValores] = useState(inicial);
  return <CamposReserva sitio={sitio} valores={valores} onCambio={setValores} />;
}

describe("CamposReserva", () => {
  beforeEach(() => { api.fechasBloqueadas.mockReset(); });

  it("calcula el total estimado según las personas", async () => {
    api.fechasBloqueadas.mockResolvedValue([]);
    render(<Contenedor inicial={{ fecha: "2030-01-10", personas: 1, nota: "" }} />);
    expect(screen.getByText(/50\.000 COP/)).toBeInTheDocument();

    const personas = screen.getByLabelText(/Número de personas/);
    await userEvent.clear(personas);
    await userEvent.type(personas, "3");
    expect(screen.getByText(/150\.000 COP/)).toBeInTheDocument();
  });

  it("muestra 'Gratuito' si el servicio no cuesta", async () => {
    api.fechasBloqueadas.mockResolvedValue([]);
    render(<CamposReserva sitio={{ id: 1, precio: "0" }} valores={{ fecha: "2030-01-10", personas: 4, nota: "" }} onCambio={() => {}} />);
    expect(screen.getByText("Gratuito")).toBeInTheDocument();
  });

  it("avisa cuando la fecha elegida está bloqueada por el prestador", async () => {
    api.fechasBloqueadas.mockResolvedValue([{ id: 1, fecha: "2030-01-10", motivo: "Mantenimiento" }]);
    render(<Contenedor inicial={{ fecha: "2030-01-10", personas: 1, nota: "" }} />);
    expect(await screen.findByText(/no atiende ese día \(Mantenimiento\)/)).toBeInTheDocument();
  });

  it("no avisa si la fecha elegida está libre", async () => {
    api.fechasBloqueadas.mockResolvedValue([{ id: 1, fecha: "2030-01-10", motivo: null }]);
    render(<Contenedor inicial={{ fecha: "2030-01-11", personas: 1, nota: "" }} />);
    await waitFor(() => expect(api.fechasBloqueadas).toHaveBeenCalledWith(7));
    expect(screen.queryByText(/no atiende ese día/)).not.toBeInTheDocument();
  });

  it("muestra el cupo máximo del servicio", async () => {
    api.fechasBloqueadas.mockResolvedValue([]);
    render(<Contenedor inicial={{ fecha: "2030-01-10", personas: 1, nota: "" }} />);
    expect(screen.getByText(/Cupo máximo: 10 personas por día/)).toBeInTheDocument();
  });
});
