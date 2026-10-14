import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Routes, Route } from "react-router-dom";
import BotonFavorito from "./BotonFavorito";

const mockAuth = { usuario: null };
const mockFav = { esFavorito: vi.fn(), alternar: vi.fn() };
vi.mock("../context/auth", () => ({ useAuth: () => mockAuth }));
vi.mock("../context/favoritos", () => ({ useFavoritos: () => mockFav }));

function montar() {
  return render(
    <MemoryRouter initialEntries={["/explorar"]}>
      <Routes>
        <Route path="/explorar" element={<BotonFavorito sitioId={5} />} />
        <Route path="/login" element={<p>Pantalla de login</p>} />
      </Routes>
    </MemoryRouter>
  );
}

describe("BotonFavorito", () => {
  beforeEach(() => {
    mockFav.esFavorito.mockReset().mockReturnValue(false);
    mockFav.alternar.mockReset();
  });

  it("envía al login a quien no ha iniciado sesión", async () => {
    mockAuth.usuario = null;
    montar();
    await userEvent.click(screen.getByRole("button"));
    expect(screen.getByText("Pantalla de login")).toBeInTheDocument();
    expect(mockFav.alternar).not.toHaveBeenCalled();
  });

  it("guarda el sitio para un turista con sesión", async () => {
    mockAuth.usuario = { id: 1, rol: "turista" };
    montar();
    await userEvent.click(screen.getByRole("button", { name: /guardar en favoritos/i }));
    expect(mockFav.alternar).toHaveBeenCalledWith(5);
  });

  it("refleja el estado de favorito activo", () => {
    mockAuth.usuario = { id: 1, rol: "turista" };
    mockFav.esFavorito.mockReturnValue(true);
    montar();
    expect(screen.getByRole("button", { name: /quitar de favoritos/i })).toHaveAttribute("aria-pressed", "true");
  });

  it("no se muestra a los administradores", () => {
    mockAuth.usuario = { id: 9, rol: "administrador" };
    montar();
    expect(screen.queryByRole("button")).not.toBeInTheDocument();
  });
});
