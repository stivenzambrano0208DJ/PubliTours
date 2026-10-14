import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, waitFor, act } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import EscanerAsistencia from "./EscanerAsistencia";
import { hoyISO, sumarDias } from "../../utils/fechas";

vi.mock("jsqr", () => ({ default: vi.fn() }));
import jsQR from "jsqr";

const reserva = (id, estado, dias = 0, extra = {}) => ({
  id, estado, codigo: `PT-AB23C${id}`, fecha_servicio: sumarDias(hoyISO(), dias), personas: 3,
  turista: { nombre: "Laura Gómez" }, sitio: { nombre: "Cascada La Diabla" }, paquete: null, ...extra,
});
const RESERVAS = [
  reserva(4, "confirmada", 0), // hoy: se puede registrar la asistencia
  reserva(5, "confirmada", 6), // futura
  reserva(6, "pendiente", 2),
  reserva(7, "completada", -1),
  reserva(8, "cancelada", 3),
  reserva(9, "no_asistio", -2),
  reserva(2, "confirmada", 0, { paquete: { nombre: "Fin de semana en la finca" } }),
];
const montar = (extra = {}) => {
  const props = { reservas: RESERVAS, accionando: null, onAccion: vi.fn(), onCerrar: vi.fn(), ...extra };
  render(<EscanerAsistencia {...props} />);
  return props;
};
const escribir = async (codigo) => {
  await userEvent.type(screen.getByLabelText(/Escribe el código/), codigo);
  await userEvent.click(screen.getByRole("button", { name: "Buscar" }));
};

// Sin cámara: el escáner muestra el aviso y deja la entrada manual (lo que pasa fuera de HTTPS o sin permiso).
describe("EscanerAsistencia: código escrito a mano", () => {
  beforeEach(() => {
    Object.defineProperty(navigator, "mediaDevices", { value: undefined, configurable: true });
  });

  it("explica que sin conexión segura no hay cámara y ofrece escribir el código", () => {
    montar();
    expect(screen.getByRole("alert")).toHaveTextContent(/conexión segura/);
    expect(screen.getByLabelText(/Escribe el código/)).toBeInTheDocument();
  });

  it("un código con formato inválido no consulta nada y lo explica", async () => {
    montar();
    await escribir("12345");
    expect(screen.getByText(/no tiene el formato de PubliTours/)).toBeInTheDocument();
    expect(screen.queryByText("Laura Gómez")).toBeNull();
  });

  it("una reserva confirmada de hoy muestra sus datos y permite registrar «Asistió»", async () => {
    const { onAccion } = montar();
    await escribir("pt-ab23c4");
    expect(screen.getByText(/Reserva válida\. Registra si el turista asistió/)).toBeInTheDocument();
    expect(screen.getByText("Laura Gómez")).toBeInTheDocument();
    expect(screen.getByText("Cascada La Diabla")).toBeInTheDocument();
    expect(screen.getByText("PT-AB23C4")).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "Asistió" }));
    expect(onAccion).toHaveBeenCalledWith(4, "asistio");
  });

  it("«No asistió» pide confirmación y no registra nada si se cancela", async () => {
    const confirm = vi.spyOn(window, "confirm").mockReturnValue(false);
    const { onAccion } = montar();
    await escribir("PT-AB23C4");
    await userEvent.click(screen.getByRole("button", { name: "No asistió" }));
    expect(confirm).toHaveBeenCalledTimes(1);
    expect(onAccion).not.toHaveBeenCalled();

    confirm.mockReturnValue(true);
    await userEvent.click(screen.getByRole("button", { name: "No asistió" }));
    expect(onAccion).toHaveBeenCalledWith(4, "no_asistio");
    confirm.mockRestore();
  });

  it("muestra el nombre del paquete cuando la reserva es de un paquete", async () => {
    montar();
    await escribir("PT-AB23C2");
    expect(screen.getByText("Fin de semana en la finca")).toBeInTheDocument();
  });

  it("una reserva confirmada para otro día es válida pero todavía no deja registrar la asistencia", async () => {
    montar();
    await escribir("PT-AB23C5");
    expect(screen.getByText(/Reserva válida para el .* Podrás registrar la asistencia desde ese día/)).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Asistió" })).toBeNull();
  });

  it.each([
    ["6", /aún está pendiente: confírmala/],
    ["7", /asistencia de esta reserva ya quedó registrada/],
    ["8", /está cancelada: no es válida/],
    ["9", /ya se registró como «no asistió»/],
  ])("la reserva …C%s explica su estado y no ofrece registrar asistencia", async (digito, mensaje) => {
    montar();
    await escribir(`PT-AB23C${digito}`);
    expect(screen.getByRole("status")).toHaveTextContent(mensaje);
    expect(screen.queryByRole("button", { name: "Asistió" })).toBeNull();
    expect(screen.queryByRole("button", { name: "No asistió" })).toBeNull();
  });

  it("un código que no es de este negocio no revela nada y permite seguir", async () => {
    montar();
    await escribir("PT-ZZ99ZZ");
    expect(screen.getByRole("alert")).toHaveTextContent(/No encontramos la reserva PT-ZZ99ZZ en tu negocio/);
    await userEvent.click(screen.getByRole("button", { name: "Escanear otra" }));
    expect(screen.getByLabelText(/Escribe el código/)).toHaveValue("");
  });

  it("mientras se guarda, los botones se deshabilitan; y se puede cerrar la ventana", async () => {
    const { onCerrar } = montar({ accionando: 4 });
    await escribir("PT-AB23C4");
    expect(screen.getByRole("button", { name: "Guardando…" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "No asistió" })).toBeDisabled();
    await userEvent.click(screen.getByRole("button", { name: "Cerrar" }));
    expect(onCerrar).toHaveBeenCalledTimes(1);
  });
});

describe("EscanerAsistencia: cámara", () => {
  let parar;
  let ciclo;

  const instalarCamara = (getUserMedia) => {
    Object.defineProperty(navigator, "mediaDevices", { value: { getUserMedia }, configurable: true });
  };
  const flujoFalso = () => ({ getTracks: () => [{ stop: parar }] });

  beforeEach(() => {
    parar = vi.fn();
    jsQR.mockReset();
    // jsdom no tiene video ni lienzo: se simulan el cuadro de la cámara y el análisis
    vi.spyOn(HTMLMediaElement.prototype, "play").mockResolvedValue();
    Object.defineProperty(HTMLMediaElement.prototype, "readyState", { value: 4, configurable: true });
    Object.defineProperty(HTMLVideoElement.prototype, "videoWidth", { value: 1280, configurable: true });
    Object.defineProperty(HTMLVideoElement.prototype, "videoHeight", { value: 720, configurable: true });
    vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockReturnValue({
      drawImage: vi.fn(), getImageData: (_x, _y, w, h) => ({ data: new Uint8ClampedArray(4), width: w, height: h }),
    });
    ciclo = vi.spyOn(globalThis, "requestAnimationFrame").mockImplementation((fn) => setTimeout(() => fn(0), 5));
  });
  afterEach(() => { vi.restoreAllMocks(); });

  it("lee el QR del comprobante, apaga la cámara y muestra la reserva", async () => {
    instalarCamara(vi.fn().mockResolvedValue(flujoFalso()));
    jsQR.mockReturnValue({ data: `${window.location.origin}/verificar/PT-AB23C4` });
    montar();
    expect(await screen.findByText(/Reserva válida\. Registra si el turista asistió/)).toBeInTheDocument();
    expect(screen.getByText("Laura Gómez")).toBeInTheDocument();
    expect(parar).toHaveBeenCalled(); // la cámara se apagó al leer
    expect(ciclo).toHaveBeenCalled();
  });

  it("pide la cámara trasera y no el micrófono", async () => {
    const pedir = vi.fn().mockResolvedValue(flujoFalso());
    instalarCamara(pedir);
    jsQR.mockReturnValue(null);
    montar();
    await waitFor(() => expect(pedir).toHaveBeenCalled());
    expect(pedir.mock.calls[0][0]).toEqual({ video: { facingMode: { ideal: "environment" } }, audio: false });
  });

  it("un QR que no es de PubliTours se avisa y sigue buscando", async () => {
    instalarCamara(vi.fn().mockResolvedValue(flujoFalso()));
    jsQR.mockReturnValue({ data: "https://otro-sitio.com/promo" }); // sigue viendo el QR ajeno hasta que la prueba lo cambie
    montar();
    expect(await screen.findByText("Ese QR no es de un comprobante de PubliTours.")).toBeInTheDocument();
    expect(screen.queryByText("Laura Gómez")).toBeNull(); // no abrió ninguna reserva
    jsQR.mockReturnValue({ data: "PT-AB23C7" }); // ahora la cámara ve un comprobante bueno
    expect(await screen.findByText(/asistencia de esta reserva ya quedó registrada/)).toBeInTheDocument();
  });

  it.each([
    ["NotAllowedError", /No diste permiso para usar la cámara/],
    ["NotFoundError", /no tiene cámara/],
    ["NotReadableError", /usada por otra aplicación/],
    ["AbortError", /No se pudo abrir la cámara/],
  ])("si la cámara falla con %s lo explica y deja escribir el código", async (nombre, mensaje) => {
    instalarCamara(vi.fn().mockRejectedValue(Object.assign(new Error("x"), { name: nombre })));
    montar();
    expect(await screen.findByRole("alert")).toHaveTextContent(mensaje);
    expect(screen.getByLabelText(/Escribe el código/)).toBeInTheDocument();
  });

  it("al cerrar apaga la cámara aunque no haya leído nada", async () => {
    instalarCamara(vi.fn().mockResolvedValue(flujoFalso()));
    jsQR.mockReturnValue(null);
    const { onCerrar } = montar();
    await screen.findByLabelText("Vista de la cámara");
    await act(async () => { await new Promise((r) => setTimeout(r, 20)); });
    await userEvent.click(screen.getByRole("button", { name: "Cerrar" }));
    expect(onCerrar).toHaveBeenCalled();
  });

  it("si la ventana se desmonta antes de que la cámara abra, el flujo se apaga igual", async () => {
    let abrir;
    instalarCamara(vi.fn(() => new Promise((resolve) => { abrir = resolve; })));
    const props = { reservas: RESERVAS, accionando: null, onAccion: vi.fn(), onCerrar: vi.fn() };
    const { unmount } = render(<EscanerAsistencia {...props} />);
    unmount();
    abrir(flujoFalso());
    await waitFor(() => expect(parar).toHaveBeenCalled());
  });
});
