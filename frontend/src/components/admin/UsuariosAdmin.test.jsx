import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import UsuariosAdmin from "./UsuariosAdmin";

vi.mock("../../api/client", () => ({ api: { usuariosAdmin: vi.fn(), estadoUsuario: vi.fn() } }));
import { api } from "../../api/client";

const usuario = (id, extra = {}) => ({ id, nombre: `Persona ${id}`, correo: `p${id}@test.com`, rol: "turista", activo: true, fecha_registro: "2031-01-05T10:00:00Z", ...extra });

describe("UsuariosAdmin: estados vacíos", () => {
  beforeEach(() => { api.usuariosAdmin.mockReset(); });

  it("muestra a las personas encontradas", async () => {
    api.usuariosAdmin.mockResolvedValue([usuario(1), usuario(2)]);
    render(<UsuariosAdmin usuarioActualId={99} />);
    expect(await screen.findByText("Persona 1")).toBeInTheDocument();
    expect(screen.getByText("2 cuenta(s) encontrada(s)")).toBeInTheDocument();
    expect(screen.queryByText(/No hay cuentas/)).toBeNull();
  });

  it("una búsqueda sin resultados lo dice en vez de dejar la tabla en blanco", async () => {
    api.usuariosAdmin.mockResolvedValueOnce([usuario(1)]).mockResolvedValue([]);
    render(<UsuariosAdmin usuarioActualId={99} />);
    await screen.findByText("Persona 1");
    await userEvent.type(screen.getByPlaceholderText(/Buscar por nombre o correo/), "nadie");
    expect(await screen.findByText("No hay cuentas que coincidan con la búsqueda.")).toBeInTheDocument();
    expect(screen.queryByRole("table")).toBeNull();
  });

  it("sin ninguna cuenta y sin filtros dice que aún no hay cuentas", async () => {
    api.usuariosAdmin.mockResolvedValue([]);
    render(<UsuariosAdmin usuarioActualId={99} />);
    expect(await screen.findByText("Aún no hay cuentas registradas.")).toBeInTheDocument();
  });
});
