import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import ReportesMensajesAdmin from "./ReportesMensajesAdmin";

vi.mock("../../api/client", async (original) => ({ ...(await original()), api: { reportesMensajesAdmin: vi.fn(), resolverReporteMensajeAdmin: vi.fn() } }));
import { api } from "../../api/client";

const reporte = (id, extra = {}) => ({
  id, motivo: "contacto_externo", detalle: "Quiere cobrar por fuera", estado: "pendiente", creado_en: "2031-03-12T20:40:00Z", reportado_por: "Finca La Esperanza",
  mensaje: { id: 10 + id, texto: "Págame por transferencia y no por la página", retirado: false, creado_en: "2031-03-12T20:30:00Z", autor: "Laura Gómez", imagenes: [{ id: 5 }], turista: "Laura Gómez", negocio: "Finca La Esperanza" },
  ...extra,
});

describe("ReportesMensajesAdmin", () => {
  beforeEach(() => {
    api.reportesMensajesAdmin.mockReset().mockResolvedValue([reporte(1), reporte(2, { motivo: "spam", detalle: null, mensaje: { ...reporte(2).mensaje, imagenes: [], texto: "Compra mis productos" } })]);
    api.resolverReporteMensajeAdmin.mockReset().mockResolvedValue({});
    vi.spyOn(window, "confirm").mockReturnValue(true);
  });

  it("muestra solo el mensaje reportado: motivo, quién lo reportó, quién lo escribió y sus fotos", async () => {
    render(<ReportesMensajesAdmin />);
    expect(await screen.findByText("Págame por transferencia y no por la página")).toBeInTheDocument();
    expect(screen.getByText("Pide datos personales o pagos de forma sospechosa")).toBeInTheDocument();
    expect(screen.getAllByText(/Reportó Finca La Esperanza/)).toHaveLength(2); // los dos reportes de la lista
    expect(screen.getAllByText(/Escrito por Laura Gómez · conversación entre Laura Gómez y Finca La Esperanza/)).toHaveLength(2);
    expect(screen.getByText("«Quiere cobrar por fuera»")).toBeInTheDocument();
    expect(screen.getByAltText("Foto reportada").getAttribute("src")).toMatch(/imagenes\/5$/);
    expect(screen.getByText(/no el resto de la conversación/)).toBeInTheDocument();
    expect(api.reportesMensajesAdmin).toHaveBeenCalledWith("pendiente");
  });

  it("descartar un reporte lo resuelve y recarga la lista", async () => {
    render(<ReportesMensajesAdmin />);
    await screen.findByText("Compra mis productos");
    api.reportesMensajesAdmin.mockResolvedValue([]);
    const tarjeta = screen.getByText("Compra mis productos").closest("article");
    await userEvent.click(within(tarjeta).getByRole("button", { name: "Descartar reporte" }));
    expect(api.resolverReporteMensajeAdmin).toHaveBeenCalledWith(2, "descartar");
    expect(await screen.findByText("No hay mensajes reportados por revisar.")).toBeInTheDocument();
  });

  it("retirar pide confirmación y, si se cancela, no hace nada", async () => {
    render(<ReportesMensajesAdmin />);
    await screen.findByText("Compra mis productos");
    const tarjeta = screen.getByText("Compra mis productos").closest("article");
    window.confirm.mockReturnValueOnce(false);
    await userEvent.click(within(tarjeta).getByRole("button", { name: "Retirar mensaje" }));
    expect(api.resolverReporteMensajeAdmin).not.toHaveBeenCalled();
    await userEvent.click(within(tarjeta).getByRole("button", { name: "Retirar mensaje" }));
    expect(api.resolverReporteMensajeAdmin).toHaveBeenCalledWith(2, "retirar");
  });

  it("si resolver falla muestra el motivo y deja el reporte donde estaba", async () => {
    api.resolverReporteMensajeAdmin.mockRejectedValue(new Error("Este reporte ya fue revisado."));
    render(<ReportesMensajesAdmin />);
    await screen.findByText("Compra mis productos");
    await userEvent.click(within(screen.getByText("Compra mis productos").closest("article")).getByRole("button", { name: "Descartar reporte" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("Este reporte ya fue revisado.");
    expect(screen.getByText("Compra mis productos")).toBeInTheDocument();
  });

  it("se pueden ver los reportes ya resueltos, sin botones de acción", async () => {
    render(<ReportesMensajesAdmin />);
    await screen.findByText("Compra mis productos");
    api.reportesMensajesAdmin.mockResolvedValue([reporte(3, { estado: "retirado", mensaje: { ...reporte(3).mensaje, retirado: true } })]);
    await userEvent.click(screen.getByRole("button", { name: "Retirados" }));
    expect(api.reportesMensajesAdmin).toHaveBeenLastCalledWith("retirado");
    expect(await screen.findByText("Este mensaje ya fue retirado.")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Retirar mensaje" })).toBeNull();
    expect(screen.queryByRole("button", { name: "Descartar reporte" })).toBeNull();
    expect(screen.getByRole("button", { name: "Retirados" })).toHaveAttribute("aria-pressed", "true");
  });

  it("sin reportes lo dice, y si no carga muestra el error", async () => {
    api.reportesMensajesAdmin.mockResolvedValueOnce([]);
    const { unmount } = render(<ReportesMensajesAdmin />);
    expect(await screen.findByText("No hay mensajes reportados por revisar.")).toBeInTheDocument();
    unmount();
    api.reportesMensajesAdmin.mockRejectedValueOnce(new Error("No se pudo cargar."));
    render(<ReportesMensajesAdmin />);
    expect(await screen.findByRole("alert")).toHaveTextContent("No se pudo cargar.");
  });
});
