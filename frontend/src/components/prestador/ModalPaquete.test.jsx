import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import ModalPaquete from "./ModalPaquete";

vi.mock("../../api/client", () => ({ api: { crearPaquete: vi.fn(), actualizarPaquete: vi.fn(), agregarImagenesPaquete: vi.fn(), eliminarImagenPaquete: vi.fn() }, urlImagen: (u) => u }));
import { api } from "../../api/client";

const sitios = [
  { id: 1, nombre: "Hospedaje en finca", precio: "80000", estado: "activo" },
  { id: 2, nombre: "Cabalgata", precio: "40000", estado: "activo" },
  { id: 3, nombre: "Almuerzo típico", precio: "30000", estado: "activo" },
  { id: 4, nombre: "Servicio pausado", precio: "10000", estado: "inactivo" },
];

const montar = (props = {}) => render(<ModalPaquete paquete={null} sitios={sitios} onCerrar={() => {}} onGuardado={() => {}} {...props} />);

// En jsdom las imágenes nunca "cargan": se simula una foto grande para que no salga la advertencia de baja resolución.
const simularFotosGrandes = () => {
  URL.createObjectURL = vi.fn((f) => `blob:${f.name}`);
  vi.stubGlobal("Image", class { set src(_) { this.naturalWidth = 1600; this.naturalHeight = 900; setTimeout(() => this.onload?.(), 0); } });
};
const foto = (n) => new File(["x"], `foto${n}.png`, { type: "image/png" });

describe("ModalPaquete — galería de fotos", () => {
  beforeEach(() => {
    api.crearPaquete.mockReset(); api.actualizarPaquete.mockReset(); api.agregarImagenesPaquete.mockReset(); api.eliminarImagenPaquete.mockReset();
    simularFotosGrandes();
  });
  afterEach(() => vi.unstubAllGlobals());

  const campoGaleria = () => document.body.querySelector('input[data-galeria="true"]'); // la ventana se dibuja sobre el body

  it("al crear, encola las fotos y las sube después de crear el paquete", async () => {
    api.crearPaquete.mockResolvedValue({ id: 9 });
    api.agregarImagenesPaquete.mockResolvedValue([]);
    const { container } = montar();
    const [a, b] = [foto(1), foto(2)];
    await userEvent.upload(campoGaleria(container), [a, b]);
    expect(await screen.findByText("Galería de fotos (2/8)")).toBeInTheDocument();
    expect(api.agregarImagenesPaquete).not.toHaveBeenCalled(); // aún no existe el paquete

    await userEvent.type(screen.getByPlaceholderText("Nombre del paquete"), "Con galería");
    await userEvent.type(screen.getByPlaceholderText("Ej. 150000"), "90000");
    await userEvent.click(screen.getByRole("checkbox", { name: /Hospedaje en finca/ }));
    await userEvent.click(screen.getByRole("checkbox", { name: /Cabalgata/ }));
    await userEvent.click(screen.getByRole("button", { name: "Crear paquete" }));

    expect(api.crearPaquete).toHaveBeenCalled();
    expect(api.agregarImagenesPaquete).toHaveBeenCalledWith(9, [a, b]);
  });

  it("al crear, una foto encolada se puede quitar antes de guardar", async () => {
    const { container } = montar();
    await userEvent.upload(campoGaleria(container), [foto(1), foto(2)]);
    await screen.findByText("Galería de fotos (2/8)");
    await userEvent.click(screen.getAllByRole("button", { name: "Quitar foto" })[0]);
    expect(screen.getByText("Galería de fotos (1/8)")).toBeInTheDocument();
  });

  it("al editar, muestra la galería existente y sube las fotos al instante", async () => {
    const paquete = { id: 5, nombre: "P", precio: 1, items: [{ sitio_id: 1, dia: 1 }, { sitio_id: 2, dia: 1 }], imagenes: [{ id: 70, imagen_url: "/uploads/a.png" }] };
    api.agregarImagenesPaquete.mockResolvedValue([{ id: 71, imagen_url: "/uploads/b.png" }]);
    const { container } = montar({ paquete });
    expect(screen.getByText("Galería de fotos (1/8)")).toBeInTheDocument();

    const nueva = foto(3);
    await userEvent.upload(campoGaleria(container), nueva);
    expect(api.agregarImagenesPaquete).toHaveBeenCalledWith(5, [nueva]);
    expect(await screen.findByText("Galería de fotos (2/8)")).toBeInTheDocument();
  });

  it("al editar, quitar una foto la elimina en el servidor", async () => {
    const paquete = { id: 5, nombre: "P", precio: 1, items: [{ sitio_id: 1, dia: 1 }, { sitio_id: 2, dia: 1 }], imagenes: [{ id: 70, imagen_url: "/uploads/a.png" }, { id: 71, imagen_url: "/uploads/b.png" }] };
    api.eliminarImagenPaquete.mockResolvedValue({});
    montar({ paquete });
    await userEvent.click(screen.getAllByRole("button", { name: "Quitar foto" })[0]);
    expect(api.eliminarImagenPaquete).toHaveBeenCalledWith(5, 70);
    expect(await screen.findByText("Galería de fotos (1/8)")).toBeInTheDocument();
  });

  it("no deja pasar de 8 fotos", async () => {
    const paquete = { id: 5, nombre: "P", precio: 1, items: [{ sitio_id: 1, dia: 1 }, { sitio_id: 2, dia: 1 }], imagenes: Array.from({ length: 7 }, (_, i) => ({ id: i + 1, imagen_url: `/uploads/${i}.png` })) };
    const { container } = montar({ paquete });
    await userEvent.upload(campoGaleria(container), [foto(1), foto(2)]);
    expect(await screen.findByText("La galería admite máximo 8 fotos.")).toBeInTheDocument();
    expect(api.agregarImagenesPaquete).not.toHaveBeenCalled();
  });
});

describe("ModalPaquete", () => {
  beforeEach(() => { api.crearPaquete.mockReset(); api.actualizarPaquete.mockReset(); });

  it("solo ofrece servicios activos", () => {
    montar();
    expect(screen.getByText("Hospedaje en finca")).toBeInTheDocument();
    expect(screen.queryByText("Servicio pausado")).not.toBeInTheDocument();
  });

  it("avisa si hay menos de 2 servicios activos para armar un paquete", () => {
    montar({ sitios: [sitios[0]] });
    expect(screen.getByText(/Necesitas al menos 2 servicios activos/)).toBeInTheDocument();
  });

  it("exige elegir al menos 2 servicios", async () => {
    montar();
    await userEvent.type(screen.getByPlaceholderText("Nombre del paquete"), "Fin de semana");
    await userEvent.type(screen.getByPlaceholderText("Ej. 150000"), "100000");
    await userEvent.click(screen.getByRole("checkbox", { name: /Hospedaje en finca/ }));
    await userEvent.click(screen.getByRole("button", { name: "Crear paquete" }));
    expect(screen.getByText("Elige al menos 2 servicios para armar un paquete.")).toBeInTheDocument();
    expect(api.crearPaquete).not.toHaveBeenCalled();
  });

  it("muestra cuánto ahorra el turista frente a comprar por separado", async () => {
    montar();
    await userEvent.click(screen.getByRole("checkbox", { name: /Hospedaje en finca/ }));
    await userEvent.click(screen.getByRole("checkbox", { name: /Cabalgata/ }));
    await userEvent.type(screen.getByPlaceholderText("Ej. 150000"), "100000");
    expect(screen.getByText(/120\.000/)).toBeInTheDocument(); // 80.000 + 40.000
    expect(screen.getByText(/ahorra/)).toHaveTextContent("20.000");
  });

  it("envía los servicios elegidos con su día y el precio por persona", async () => {
    api.crearPaquete.mockResolvedValue({ id: 9 });
    const onGuardado = vi.fn();
    montar({ onGuardado });

    await userEvent.type(screen.getByPlaceholderText("Nombre del paquete"), "Fin de semana en la finca");
    await userEvent.click(screen.getByRole("checkbox", { name: /Hospedaje en finca/ }));
    await userEvent.click(screen.getByRole("checkbox", { name: /Almuerzo típico/ }));
    await userEvent.type(screen.getByPlaceholderText("Ej. 150000"), "90000");
    await userEvent.click(screen.getByRole("button", { name: "Crear paquete" }));

    expect(api.crearPaquete).toHaveBeenCalledWith(expect.objectContaining({
      nombre: "Fin de semana en la finca",
      precio: 90000,
      sitios: [{ sitio_id: 1, dia: 1 }, { sitio_id: 3, dia: 1 }],
    }), null); // sin foto de portada
    expect(onGuardado).toHaveBeenCalled();
  });

  it("envía la foto de portada elegida junto con el paquete", async () => {
    api.crearPaquete.mockResolvedValue({ id: 9 });
    URL.createObjectURL = vi.fn(() => "blob:vista-previa");
    montar();
    const foto = new File(["x"], "portada.png", { type: "image/png" });
    // la imagen es grande, así que no se muestra la advertencia de baja resolución
    vi.stubGlobal("Image", class { set src(_) { this.naturalWidth = 1600; this.naturalHeight = 900; setTimeout(() => this.onload?.(), 0); } });

    await userEvent.upload(document.body.querySelector('input[type="file"]'), foto);
    expect(await screen.findByAltText("Vista previa de la portada")).toBeInTheDocument();

    await userEvent.type(screen.getByPlaceholderText("Nombre del paquete"), "Paquete con foto");
    await userEvent.type(screen.getByPlaceholderText("Ej. 150000"), "90000");
    await userEvent.click(screen.getByRole("checkbox", { name: /Hospedaje en finca/ }));
    await userEvent.click(screen.getByRole("checkbox", { name: /Cabalgata/ }));
    await userEvent.click(screen.getByRole("button", { name: "Crear paquete" }));
    expect(api.crearPaquete).toHaveBeenCalledWith(expect.objectContaining({ nombre: "Paquete con foto" }), foto);
    vi.unstubAllGlobals();
  });

  it("al editar precarga los servicios del paquete y usa la actualización", async () => {
    api.actualizarPaquete.mockResolvedValue({ id: 5 });
    const paquete = { id: 5, nombre: "Existente", descripcion: "", precio: 70000, capacidad: null, items: [{ sitio_id: 1, dia: 1 }, { sitio_id: 2, dia: 2 }] };
    montar({ paquete });

    expect(screen.getByRole("checkbox", { name: /Hospedaje en finca/ })).toBeChecked();
    expect(screen.getByRole("checkbox", { name: /Almuerzo típico/ })).not.toBeChecked();
    await userEvent.click(screen.getByRole("button", { name: "Guardar cambios" }));
    expect(api.actualizarPaquete).toHaveBeenCalledWith(5, expect.objectContaining({ sitios: [{ sitio_id: 1, dia: 1 }, { sitio_id: 2, dia: 2 }] }), null);
  });

  it("muestra el error del servidor", async () => {
    api.crearPaquete.mockImplementation(() => Promise.reject(new Error("Solo puedes incluir servicios de tu propio negocio.")));
    montar();
    await userEvent.type(screen.getByPlaceholderText("Nombre del paquete"), "Paquete X");
    await userEvent.type(screen.getByPlaceholderText("Ej. 150000"), "50000");
    await userEvent.click(screen.getByRole("checkbox", { name: /Hospedaje en finca/ }));
    await userEvent.click(screen.getByRole("checkbox", { name: /Cabalgata/ }));
    await userEvent.click(screen.getByRole("button", { name: "Crear paquete" }));
    expect(await screen.findByText(/tu propio negocio/)).toBeInTheDocument();
  });
});
