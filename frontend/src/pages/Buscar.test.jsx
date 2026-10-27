import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, waitFor, within, fireEvent } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import Buscar from "./Buscar";

const navigate = vi.fn();
let usuario = null;
vi.mock("react-router-dom", async (original) => ({ ...(await original()), useNavigate: () => navigate }));
vi.mock("../context/auth", () => ({ useAuth: () => ({ usuario }) }));
vi.mock("../components/BotonFavorito", () => ({ default: () => null }));
vi.mock("../components/mapa/MapaSitios", () => ({ default: ({ sitios, ubicacionUsuario }) => <div data-testid="mapa" data-n={sitios.length} data-ubicacion={ubicacionUsuario ? "si" : "no"} /> }));
vi.mock("../api/client", () => ({
  urlImagen: (x) => x,
  api: {
    buscarSitios: vi.fn(), solicitarReserva: vi.fn(),
    fechasBloqueadas: vi.fn(() => Promise.resolve([])), disponibilidadSitio: vi.fn(() => Promise.resolve({ dias: [] })), cotizarSitio: vi.fn(),
  },
}));
import { api } from "../api/client";

const sitio = (id, extra = {}) => ({
  id, nombre: `Sitio ${id}`, categoria: "Naturaleza", municipio: "Florencia", precio: "20000", descripcion: `Descripción ${id}`,
  tipo_viaje: "pareja, familia", imagen_url: null, total_resenas: 0, estado: "activo", ...extra,
});
const catalogo = [sitio(1), sitio(2, { categoria: "Aventura", municipio: "Morelia" }), sitio(3, { municipio: "Morelia" })];
const pagina = (resultados, extra = {}) => ({ resultados, total: resultados.length, total_paginas: 1, page: 1, ...extra });

function montar(ruta = "/explorar") {
  return render(<MemoryRouter initialEntries={[ruta]}><Buscar /></MemoryRouter>);
}
const ultimaBusqueda = () => api.buscarSitios.mock.calls.filter(([p]) => p.limit !== 100).at(-1)[0];
const abrirFiltros = async () => { await screen.findByText(/destino\(s\) encontrado\(s\)/); };

describe("Buscar (explorar destinos)", () => {
  beforeEach(() => {
    usuario = null;
    navigate.mockReset();
    api.buscarSitios.mockReset().mockImplementation((p) => Promise.resolve(p.limit === 100 ? pagina(catalogo) : pagina([catalogo[0], catalogo[1]])));
    api.solicitarReserva.mockReset();
  });

  it("carga los resultados y deriva categorías y cantidad de destinos del catálogo real", async () => {
    montar();
    expect(await screen.findByText("2 destino(s) encontrado(s)")).toBeInTheDocument();
    expect(screen.getByText("3 destinos verificados en el catálogo")).toBeInTheDocument();
    expect(screen.getByText("Todos (3)")).toBeInTheDocument();
    expect(screen.getByText("Naturaleza (2)")).toBeInTheDocument();
    expect(screen.getByText("Aventura (1)")).toBeInTheDocument();
    expect(screen.getAllByRole("article")).toHaveLength(2);
    expect(ultimaBusqueda()).toMatchObject({ texto: "", orden: "relevancia", page: 1, limit: 6 });
  });

  it("toma el texto inicial de la dirección (?texto=)", async () => {
    montar("/explorar?texto=cascada");
    await abrirFiltros();
    expect(ultimaBusqueda().texto).toBe("cascada");
    expect(screen.getByPlaceholderText(/¿Qué experiencia buscas/)).toHaveValue("cascada");
  });

  it("busca por texto al enviar el formulario y puede limpiar el texto", async () => {
    montar();
    await abrirFiltros();
    await userEvent.type(screen.getByPlaceholderText(/¿Qué experiencia buscas/), "finca");
    await userEvent.click(screen.getByRole("button", { name: /Explorar/ }));
    await waitFor(() => expect(ultimaBusqueda().texto).toBe("finca"));

    await userEvent.click(screen.getByRole("button", { name: "close" }));
    await waitFor(() => expect(ultimaBusqueda().texto).toBe(""));
  });

  it("filtrar por categoría, interés, municipio, calificación y fecha vuelve a consultar con esos filtros", async () => {
    montar();
    await abrirFiltros();

    await userEvent.click(screen.getByRole("button", { name: /Aventura \(1\)/ }));
    await waitFor(() => expect(ultimaBusqueda().categoria).toBe("Aventura"));
    await userEvent.click(screen.getByRole("button", { name: /Aventura \(1\)/ })); // la misma categoría otra vez la quita
    await waitFor(() => expect(ultimaBusqueda().categoria).toBe(""));

    await userEvent.click(screen.getByRole("button", { name: "Familia" }));
    await waitFor(() => expect(ultimaBusqueda().tipo_viaje).toBe("familia"));

    await userEvent.selectOptions(screen.getByDisplayValue("Municipio: Todos"), "Morelia");
    await waitFor(() => expect(ultimaBusqueda().municipio).toBe("Morelia"));

    await userEvent.selectOptions(screen.getByLabelText("Calificación mínima"), "4");
    await waitFor(() => expect(ultimaBusqueda().calificacion_min).toBe("4"));

    fireEvent.change(screen.getByLabelText("Disponible el"), { target: { value: "2031-06-10" } });
    await waitFor(() => expect(ultimaBusqueda().fecha).toBe("2031-06-10"));
    await userEvent.click(screen.getByRole("button", { name: "Quitar fecha" }));
    await waitFor(() => expect(ultimaBusqueda().fecha).toBe(""));

    // los filtros se acumulan
    expect(ultimaBusqueda()).toMatchObject({ tipo_viaje: "familia", municipio: "Morelia", calificacion_min: "4" });
  });

  it("el presupuesto se aplica al salir del campo y los municipios salen del catálogo", async () => {
    montar();
    await abrirFiltros();
    const municipios = within(screen.getByDisplayValue("Municipio: Todos")).getAllByRole("option").map((o) => o.textContent);
    expect(municipios).toEqual(["Municipio: Todos", "Florencia", "Morelia"]);

    const presupuesto = screen.getByPlaceholderText(/Presupuesto máx/);
    await userEvent.type(presupuesto, "50000");
    await userEvent.tab();
    await waitFor(() => expect(ultimaBusqueda().presupuesto_max).toBe("50000"));
  });

  it("ordena por mejor calificados y por precio", async () => {
    montar();
    await abrirFiltros();
    await userEvent.selectOptions(screen.getByDisplayValue("Relevancia"), "calificacion");
    await waitFor(() => expect(ultimaBusqueda().orden).toBe("calificacion"));
    await userEvent.selectOptions(screen.getByDisplayValue("Mejor calificados"), "precio_asc");
    await waitFor(() => expect(ultimaBusqueda().orden).toBe("precio_asc"));
  });

  describe("ordenar por cercanía", () => {
    let alerta;
    beforeEach(() => { alerta = vi.spyOn(window, "alert").mockImplementation(() => {}); });
    afterEach(() => { alerta.mockRestore(); delete navigator.geolocation; });

    it("pide la ubicación y la envía con el orden", async () => {
      navigator.geolocation = { getCurrentPosition: (ok) => ok({ coords: { latitude: 1.6, longitude: -75.6 } }) };
      montar();
      await abrirFiltros();
      await userEvent.selectOptions(screen.getByDisplayValue("Relevancia"), "cercania");
      await waitFor(() => expect(ultimaBusqueda()).toMatchObject({ orden: "cercania", lat: 1.6, lng: -75.6 }));
    });

    it("si no hay permiso de ubicación avisa y no cambia la búsqueda", async () => {
      navigator.geolocation = { getCurrentPosition: (ok, error) => error(new Error("denegado")) };
      montar();
      await abrirFiltros();
      const llamadas = api.buscarSitios.mock.calls.length;
      await userEvent.selectOptions(screen.getByDisplayValue("Relevancia"), "cercania");
      expect(alerta).toHaveBeenCalledWith(expect.stringContaining("No pudimos obtener tu ubicación"));
      expect(api.buscarSitios.mock.calls.length).toBe(llamadas);
    });

    it("si el navegador no soporta ubicación lo dice", async () => {
      montar();
      await abrirFiltros();
      await userEvent.selectOptions(screen.getByDisplayValue("Relevancia"), "cercania");
      expect(alerta).toHaveBeenCalledWith("Tu navegador no soporta geolocalización.");
    });
  });

  it("pagina los resultados sin perder los filtros", async () => {
    api.buscarSitios.mockImplementation((p) => Promise.resolve(p.limit === 100 ? pagina(catalogo) : pagina([catalogo[0]], { total: 14, total_paginas: 3, page: p.page })));
    montar();
    expect(await screen.findByText(/Página/)).toHaveTextContent("Página 1 de 3");
    expect(screen.getAllByRole("button", { name: "chevron_left" })[0]).toBeDisabled();

    await userEvent.click(screen.getByRole("button", { name: "2" }));
    await waitFor(() => expect(ultimaBusqueda().page).toBe(2));
    await userEvent.click(screen.getByRole("button", { name: "chevron_right" }));
    await waitFor(() => expect(ultimaBusqueda().page).toBe(3));
  });

  it("al cambiar un filtro vuelve a la primera página", async () => {
    api.buscarSitios.mockImplementation((p) => Promise.resolve(p.limit === 100 ? pagina(catalogo) : pagina([catalogo[0]], { total: 14, total_paginas: 3, page: p.page })));
    montar();
    await screen.findByText(/Página/);
    await userEvent.click(screen.getByRole("button", { name: "3" }));
    await waitFor(() => expect(ultimaBusqueda().page).toBe(3));
    await userEvent.click(screen.getByRole("button", { name: /Naturaleza \(2\)/ }));
    await waitFor(() => expect(ultimaBusqueda()).toMatchObject({ categoria: "Naturaleza", page: 1 }));
  });

  it("la vista de mapa carga todos los resultados del filtro y usa la ubicación del turista", async () => {
    montar();
    await abrirFiltros();
    await userEvent.click(screen.getByRole("button", { name: /Mapa/ }));
    expect(await screen.findByTestId("mapa")).toHaveAttribute("data-n", "3"); // todos los del filtro (hasta 100), no solo la página
    expect(api.buscarSitios).toHaveBeenCalledWith(expect.objectContaining({ page: 1, limit: 100, orden: "relevancia" }));
    expect(screen.queryByText(/Página/)).not.toBeInTheDocument();
  });

  it("muestra el mensaje de sin resultados y los errores del servidor", async () => {
    api.buscarSitios.mockImplementation((p) => Promise.resolve(p.limit === 100 ? pagina(catalogo) : pagina([])));
    montar();
    expect(await screen.findByText(/No se encontraron resultados/)).toBeInTheDocument();
  });

  it("si la búsqueda falla muestra el error", async () => {
    api.buscarSitios.mockImplementation((p) => (p.limit === 100 ? Promise.resolve(pagina(catalogo)) : Promise.reject(new Error("Sin conexión con el servidor."))));
    montar();
    expect(await screen.findByText("Sin conexión con el servidor.")).toBeInTheDocument();
    expect(screen.queryByText(/No se encontraron resultados/)).not.toBeInTheDocument();
  });

  it("cada tarjeta muestra precio, calificación, etiquetas y distancia cuando existen", async () => {
    api.buscarSitios.mockImplementation((p) => Promise.resolve(p.limit === 100 ? pagina(catalogo) : pagina([
      sitio(1, { precio: "0", total_resenas: 3, calificacion_promedio: 4.5, distancia_km: "2.34" }),
      sitio(2, { precio: "35000", descripcion: null }),
    ])));
    montar();
    const [primera, segunda] = await screen.findAllByRole("article");
    expect(within(primera).getByText("Gratuito")).toBeInTheDocument();
    expect(within(primera).getByText("4.5 (3)")).toBeInTheDocument();
    expect(within(primera).getByText(/a 2.3 km/)).toBeInTheDocument();
    expect(within(primera).getByText("pareja")).toBeInTheDocument();
    expect(within(segunda).getByText("$35.000")).toBeInTheDocument();
    expect(within(segunda).getByText("Sin descripción disponible.")).toBeInTheDocument();
    await userEvent.click(within(primera).getByRole("button", { name: /Ver detalle/ }));
    expect(navigate).toHaveBeenCalledWith("/sitios/1");
  });

  describe("reservar desde la tarjeta", () => {
    it("sin sesión lleva a iniciar sesión", async () => {
      montar();
      await userEvent.click((await screen.findAllByRole("button", { name: /Reservar/ }))[0]);
      expect(navigate).toHaveBeenCalledWith("/login");
    });

    it("con sesión abre el formulario, envía la solicitud y confirma", async () => {
      usuario = { id: 1, rol: "turista" };
      api.solicitarReserva.mockResolvedValue({ id: 9 });
      montar();
      await userEvent.click((await screen.findAllByRole("button", { name: /Reservar/ }))[0]);
      expect(screen.getByRole("heading", { name: "Reservar" })).toBeInTheDocument();
      expect(screen.getByText("Sitio 1 · Florencia")).toBeInTheDocument();

      await userEvent.clear(screen.getByLabelText(/Número de personas/));
      await userEvent.type(screen.getByLabelText(/Número de personas/), "3");
      await userEvent.click(screen.getByRole("button", { name: "Confirmar" }));

      await waitFor(() => expect(api.solicitarReserva).toHaveBeenCalledWith(expect.objectContaining({ sitio_id: 1, personas: 3, ninos: 0 })));
      expect(await screen.findByRole("heading", { name: "Solicitud enviada" })).toBeInTheDocument();
      await userEvent.click(screen.getByRole("button", { name: "Ver mis reservas" }));
      expect(navigate).toHaveBeenCalledWith("/mis-reservas");
    });

    it("muestra el error del servidor y deja intentar de nuevo o cancelar", async () => {
      usuario = { id: 1, rol: "turista" };
      api.solicitarReserva.mockRejectedValue(new Error("No hay cupos suficientes para ese día."));
      montar();
      await userEvent.click((await screen.findAllByRole("button", { name: /Reservar/ }))[0]);
      await userEvent.click(screen.getByRole("button", { name: "Confirmar" }));
      expect(await screen.findByText("No hay cupos suficientes para ese día.")).toBeInTheDocument();
      await userEvent.click(screen.getByRole("button", { name: "Cancelar" }));
      expect(screen.queryByRole("heading", { name: "Reservar" })).not.toBeInTheDocument();
    });
  });

  describe("el administrador", () => {
    it("ve «Más información» en lugar de reservar y la ficha del servicio", async () => {
      usuario = { id: 1, rol: "administrador" };
      montar();
      expect(await screen.findAllByRole("button", { name: /Más información/ })).toHaveLength(2);
      expect(screen.queryByRole("button", { name: /^Reservar/ })).not.toBeInTheDocument();

      await userEvent.click(screen.getAllByRole("button", { name: /Más información/ })[0]);
      expect(screen.getAllByRole("heading", { name: "Sitio 1" })).toHaveLength(2); // la tarjeta y la ficha
      expect(screen.getByText("$20.000 COP")).toBeInTheDocument();
      await userEvent.click(screen.getByRole("button", { name: "Ir al Panel Admin" }));
      expect(navigate).toHaveBeenCalledWith("/admin");
    });
  });

  it("el banner lleva al generador de itinerarios", async () => {
    montar();
    await abrirFiltros();
    await userEvent.click(screen.getByRole("button", { name: /Generar Itinerario/ }));
    expect(navigate).toHaveBeenCalledWith("/itinerario");
  });
});
