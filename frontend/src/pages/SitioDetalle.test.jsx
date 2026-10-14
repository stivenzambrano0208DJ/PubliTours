import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Routes, Route } from "react-router-dom";
import SitioDetalle from "./SitioDetalle";

const navigate = vi.fn();
let usuario = null;
vi.mock("react-router-dom", async (original) => ({ ...(await original()), useNavigate: () => navigate }));
vi.mock("../context/auth", () => ({ useAuth: () => ({ usuario }) }));
vi.mock("../components/MapaVisor", () => ({ default: ({ lat, lng }) => <div data-testid="mapa" data-lat={lat} data-lng={lng} /> }));
vi.mock("../components/BotonFavorito", () => ({ default: () => null }));
vi.mock("../components/ResenasSitio", () => ({ default: ({ sitioId }) => <div data-testid="resenas" data-sitio={sitioId} /> }));
vi.mock("../api/client", () => ({
  urlImagen: (x) => x,
  api: {
    obtenerSitio: vi.fn(), solicitarReserva: vi.fn(), miPerfilPrestador: vi.fn(), configuracion: vi.fn(),
    fechasBloqueadas: vi.fn(() => Promise.resolve([])), disponibilidadSitio: vi.fn(() => Promise.resolve({ dias: [] })), cotizarSitio: vi.fn(),
  },
}));
import { api } from "../api/client";

const sitioBase = (extra = {}) => ({
  id: 7, nombre: "Cascada La Diabla", categoria: "Naturaleza", municipio: "Morelia", estado: "activo", precio: "20000",
  horario: null, tipo_viaje: null, descripcion: null, latitud: null, longitud: null, imagenes: [], imagen_url: null,
  total_resenas: 0, politica_cancelacion: "flexible", tarifas: [],
  Prestador: { id: 3, nombre_negocio: "Finca El Paraíso", municipio: "Morelia", estado_verificacion: "aprobado", telefono: null },
  ...extra,
});

function montar() {
  return render(
    <MemoryRouter initialEntries={["/sitios/7"]}>
      <Routes><Route path="/sitios/:id" element={<SitioDetalle />} /></Routes>
    </MemoryRouter>
  );
}
const abrir = async (extra) => {
  api.obtenerSitio.mockResolvedValue(sitioBase(extra));
  montar();
  await screen.findByRole("heading", { level: 1, name: "Cascada La Diabla" });
};

describe("SitioDetalle", () => {
  beforeEach(() => {
    usuario = null;
    navigate.mockReset();
    api.obtenerSitio.mockReset();
    api.solicitarReserva.mockReset();
    api.miPerfilPrestador.mockReset().mockResolvedValue({ id: 99 });
    api.configuracion.mockReset().mockResolvedValue({ comision_pct: 10, politicas_cancelacion: { flexible: 1, moderada: 3, estricta: 7 } });
  });

  it("mientras carga lo dice y pide el servicio de la dirección", async () => {
    api.obtenerSitio.mockReturnValue(new Promise(() => {}));
    montar();
    expect(screen.getByText("Cargando...")).toBeInTheDocument();
    await waitFor(() => expect(api.obtenerSitio).toHaveBeenCalledWith("7"));
  });

  it("si el servicio no existe o falla muestra el error y un enlace para volver", async () => {
    api.obtenerSitio.mockRejectedValue(new Error("Sitio no encontrado."));
    montar();
    expect(await screen.findByText("Sitio no encontrado.")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Volver a Explorar Destinos" })).toHaveAttribute("href", "/explorar");
  });

  it("muestra los datos reales del servicio y valores por defecto honestos para lo que falta", async () => {
    await abrir();
    expect(screen.getAllByText("Naturaleza").length).toBeGreaterThanOrEqual(2); // chip del encabezado y ficha técnica
    expect(screen.getByText("Morelia, Caquetá")).toBeInTheDocument();
    expect(screen.getAllByText("No registrado")).toHaveLength(2); // horario y tipo de viaje
    expect(screen.getByText("Este prestador aún no agregó una descripción detallada para este sitio.")).toBeInTheDocument();
    expect(screen.getAllByText("$20.000").length).toBeGreaterThanOrEqual(2); // ficha y panel de reserva
    expect(screen.getByText("COP / persona")).toBeInTheDocument();
    expect(screen.getByTestId("resenas")).toHaveAttribute("data-sitio", "7");
  });

  it("un servicio gratuito no muestra moneda", async () => {
    await abrir({ precio: "0.00" });
    expect(screen.getAllByText("Gratuito").length).toBeGreaterThanOrEqual(2);
    expect(screen.queryByText("COP / persona")).not.toBeInTheDocument();
  });

  it("muestra la calificación solo si ya tiene reseñas", async () => {
    await abrir();
    expect(screen.queryByText(/\(\d+\)$/)).not.toBeInTheDocument();
  });

  it("con reseñas muestra el promedio y la cantidad", async () => {
    await abrir({ total_resenas: 12, calificacion_promedio: 4.5 });
    expect(screen.getByText("4.5 (12)")).toBeInTheDocument();
  });

  it("indica si el servicio está disponible y si el prestador está verificado", async () => {
    await abrir();
    expect(screen.getByText("Disponible")).toBeInTheDocument();
    expect(screen.getByText("Prestador verificado")).toBeInTheDocument();
  });

  it("un servicio pausado no se puede reservar y lo explica", async () => {
    usuario = { id: 1, rol: "turista", nombre: "Ana" };
    await abrir({ estado: "inactivo" });
    expect(screen.getByText("No disponible actualmente")).toBeInTheDocument();
    expect(screen.getByText("Este sitio no está disponible para reservas en este momento.")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /Reservar$/ })).not.toBeInTheDocument();
  });

  it("el mapa aparece solo cuando hay coordenadas", async () => {
    await abrir();
    expect(screen.queryByTestId("mapa")).not.toBeInTheDocument();
  });

  it("con coordenadas muestra la ubicación", async () => {
    await abrir({ latitud: "1.61", longitud: "-75.61" });
    expect(screen.getByTestId("mapa")).toHaveAttribute("data-lat", "1.61");
    expect(screen.getByRole("heading", { name: "Ubicación" })).toBeInTheDocument();
  });

  describe("fotos", () => {
    it("con una sola foto se abre a pantalla completa sin controles de navegación", async () => {
      await abrir({ imagenes: [], imagen_url: "/uploads/a.jpg" });
      expect(screen.queryByRole("button", { name: /Ver \d+ fotos/ })).not.toBeInTheDocument();
      await userEvent.click(screen.getByRole("img", { name: "Cascada La Diabla" }));
      expect(screen.getByRole("img", { name: "Cascada La Diabla 1" })).toBeInTheDocument();
      expect(screen.queryByText("1 / 1")).not.toBeInTheDocument();
    });

    it("con varias fotos hay visor con contador y avance circular", async () => {
      await abrir({ imagenes: [{ imagen_url: "/a.jpg" }, { imagen_url: "/b.jpg" }, { imagen_url: "/c.jpg" }] });
      await userEvent.click(screen.getByRole("button", { name: /Ver 3 fotos/ }));
      expect(screen.getByText("1 / 3")).toBeInTheDocument();

      await userEvent.click(screen.getByRole("button", { name: "chevron_right" }));
      expect(screen.getByText("2 / 3")).toBeInTheDocument();
      await userEvent.click(screen.getByRole("button", { name: "chevron_right" }));
      await userEvent.click(screen.getByRole("button", { name: "chevron_right" }));
      expect(screen.getByText("1 / 3")).toBeInTheDocument(); // vuelve al principio
      await userEvent.click(screen.getByRole("button", { name: "chevron_left" }));
      expect(screen.getByText("3 / 3")).toBeInTheDocument(); // y hacia atrás da la vuelta

      await userEvent.click(screen.getAllByRole("button", { name: "close" })[0]);
      expect(screen.queryByText("3 / 3")).not.toBeInTheDocument();
    });
  });

  describe("prestador", () => {
    it("enlaza a la página del negocio y al WhatsApp solo si tiene teléfono", async () => {
      await abrir({ Prestador: { ...sitioBase().Prestador, telefono: "3001234567" } });
      expect(screen.getByRole("link", { name: /Ver negocio/ })).toHaveAttribute("href", "/negocios/3");
      expect(screen.getByRole("link", { name: "Finca El Paraíso" })).toHaveAttribute("href", "/negocios/3");
      expect(screen.getByRole("link", { name: /Escribir por WhatsApp/ })).toHaveAttribute("href", "https://wa.me/573001234567");
    });

    it("sin teléfono no ofrece WhatsApp", async () => {
      await abrir();
      expect(screen.queryByRole("link", { name: /WhatsApp/ })).not.toBeInTheDocument();
    });

    it("un servicio sin prestador asociado no inventa uno", async () => {
      await abrir({ Prestador: null });
      expect(screen.queryByRole("link", { name: /Ver negocio/ })).not.toBeInTheDocument();
      expect(screen.queryByText("Prestador verificado")).not.toBeInTheDocument();
    });
  });

  it("lista las tarifas especiales del servicio", async () => {
    await abrir({
      precio_nino: "10000", grupo_min_personas: 5, grupo_descuento_pct: 15,
      tarifas: [{ id: 1, nombre: "Diciembre", fecha_desde: "2031-12-15", fecha_hasta: "2032-01-10", precio: "30000" }],
    });
    expect(screen.getByText("Niños: $10.000")).toBeInTheDocument();
    expect(screen.getByText("15 % de descuento desde 5 personas")).toBeInTheDocument();
    expect(screen.getByText("Diciembre (2031-12-15 a 2032-01-10): $30.000")).toBeInTheDocument();
  });

  it("niños gratis se dice «gratis», no $0", async () => {
    await abrir({ precio_nino: "0" });
    expect(screen.getByText("Niños: gratis")).toBeInTheDocument();
  });

  describe("reservar", () => {
    it("sin sesión el botón invita a iniciarla y lleva al inicio de sesión", async () => {
      await abrir();
      await userEvent.click(screen.getByRole("button", { name: /Inicia sesión para reservar/ }));
      expect(navigate).toHaveBeenCalledWith("/login");
      expect(api.solicitarReserva).not.toHaveBeenCalled();
    });

    it("con sesión envía la solicitud con lo elegido y confirma", async () => {
      usuario = { id: 1, rol: "turista", nombre: "Ana" };
      api.solicitarReserva.mockResolvedValue({ id: 3 });
      await abrir();
      expect(await screen.findByText(/Cancelación flexible\./)).toBeInTheDocument(); // la política se ve antes de reservar

      await userEvent.clear(screen.getByLabelText(/Número de personas/));
      await userEvent.type(screen.getByLabelText(/Número de personas/), "4");
      await userEvent.click(screen.getByRole("button", { name: /Reservar$/ }));

      await waitFor(() => expect(api.solicitarReserva).toHaveBeenCalledWith(expect.objectContaining({ sitio_id: 7, personas: 4, ninos: 0 })));
      expect(await screen.findByRole("heading", { name: "Solicitud enviada" })).toBeInTheDocument();
      await userEvent.click(screen.getByRole("button", { name: "Ver mis reservas" }));
      expect(navigate).toHaveBeenCalledWith("/mis-reservas");
    });

    it("si el servidor la rechaza muestra el motivo y permite reintentar", async () => {
      usuario = { id: 1, rol: "turista", nombre: "Ana" };
      api.solicitarReserva.mockRejectedValue(new Error("No hay cupos suficientes para ese día."));
      await abrir();
      await userEvent.click(screen.getByRole("button", { name: /Reservar$/ }));
      expect(await screen.findByText("No hay cupos suficientes para ese día.")).toBeInTheDocument();
      expect(screen.getByRole("button", { name: /Reservar$/ })).toBeEnabled();
    });

    it("el administrador ve un aviso en lugar del formulario", async () => {
      usuario = { id: 1, rol: "administrador", nombre: "Admin" };
      await abrir();
      expect(screen.getByText(/modo administrador/)).toBeInTheDocument();
      expect(screen.queryByRole("button", { name: /Reservar$/ })).not.toBeInTheDocument();
    });

    it("el prestador dueño del servicio no lo reserva: se reconoce por su negocio, no por su nombre", async () => {
      usuario = { id: 2, rol: "prestador", nombre: "María Gómez" }; // su nombre NO coincide con el del negocio
      api.miPerfilPrestador.mockResolvedValue({ id: 3 }); // pero su negocio es el que ofrece este servicio
      await abrir();
      expect(await screen.findByText("Este es uno de tus servicios. Gestiónalo desde tu Portal Prestador.")).toBeInTheDocument();
      expect(screen.queryByRole("button", { name: /Reservar$/ })).not.toBeInTheDocument();
    });

    it("un prestador puede reservar servicios de otros negocios", async () => {
      usuario = { id: 2, rol: "prestador", nombre: "Finca El Paraíso" }; // aunque su nombre coincida con el de otro negocio
      api.miPerfilPrestador.mockResolvedValue({ id: 99 });
      await abrir();
      expect(await screen.findByRole("button", { name: /Reservar$/ })).toBeInTheDocument();
      expect(screen.queryByText(/uno de tus servicios/)).not.toBeInTheDocument();
    });
  });

  describe("compartir", () => {
    afterEach(() => { delete navigator.share; delete navigator.clipboard; });

    it("usa el menú del dispositivo cuando existe", async () => {
      navigator.share = vi.fn().mockResolvedValue();
      await abrir();
      await userEvent.click(screen.getByRole("button", { name: /Compartir/ }));
      expect(navigator.share).toHaveBeenCalledWith({ title: "Cascada La Diabla", url: window.location.href });
    });

    it("si no existe copia el enlace y lo avisa", async () => {
      const escribir = vi.fn().mockResolvedValue();
      Object.defineProperty(navigator, "clipboard", { value: { writeText: escribir }, configurable: true });
      const alerta = vi.spyOn(window, "alert").mockImplementation(() => {});
      await abrir();
      await userEvent.click(screen.getByRole("button", { name: /Compartir/ }));
      expect(escribir).toHaveBeenCalledWith(window.location.href);
      expect(alerta).toHaveBeenCalledWith("Enlace copiado al portapapeles.");
      alerta.mockRestore();
    });

    it("cancelar el menú de compartir no es un error", async () => {
      navigator.share = vi.fn().mockRejectedValue(Object.assign(new Error("cancelado"), { name: "AbortError" }));
      await abrir();
      await userEvent.click(screen.getByRole("button", { name: /Compartir/ }));
      expect(within(document.body).getByRole("heading", { level: 1 })).toBeInTheDocument();
    });
  });
});
