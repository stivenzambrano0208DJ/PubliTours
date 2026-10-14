import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import TendenciasAdmin from "./TendenciasAdmin";
import AuditoriaAdmin from "./AuditoriaAdmin";
import AnunciosAdmin from "./AnunciosAdmin";

vi.mock("../../api/client", () => ({
  api: { tendenciasAdmin: vi.fn(), csvTendenciasAdmin: vi.fn(), auditoriaAdmin: vi.fn(), enviarAnuncio: vi.fn() },
}));
import { api } from "../../api/client";

describe("TendenciasAdmin", () => {
  beforeEach(() => { api.tendenciasAdmin.mockReset(); api.csvTendenciasAdmin.mockReset(); });

  const datos = {
    periodo: { desde: "2031-01-01", hasta: "2031-02-28" },
    totales: { turistas_nuevos: 5, prestadores_nuevos: 2, solicitudes: 9, aceptadas: 4, valor_aceptado: 480000, comision_estimada: 48000 },
    por_mes: [
      { mes: "2031-01", turistas_nuevos: 3, prestadores_nuevos: 1, solicitudes: 4, aceptadas: 1, valor_aceptado: 80000, comision_estimada: 8000 },
      { mes: "2031-02", turistas_nuevos: 2, prestadores_nuevos: 1, solicitudes: 5, aceptadas: 3, valor_aceptado: 400000, comision_estimada: 40000 },
    ],
  };

  it("muestra los totales y las cinco gráficas del servidor", async () => {
    api.tendenciasAdmin.mockResolvedValue(datos);
    render(<TendenciasAdmin />);
    expect(await screen.findByText("$480.000")).toBeInTheDocument();
    expect(screen.getByRole("img", { name: "Solicitudes de reserva por mes: ene 31 4, feb 31 5" })).toBeInTheDocument();
    expect(screen.getByRole("img", { name: /^Valor aceptado por mes: ene 31 \$80 mil, feb 31 \$400 mil$/ })).toBeInTheDocument();
    expect(screen.getByText("$48.000")).toBeInTheDocument(); // comisión estimada total
    expect(screen.getByRole("img", { name: /^Comisión estimada por mes: ene 31 \$8 mil, feb 31 \$40 mil$/ })).toBeInTheDocument();
    expect(screen.getByRole("img", { name: "Turistas nuevos por mes: ene 31 3, feb 31 2" })).toBeInTheDocument();
    expect(screen.getByRole("img", { name: "Prestadores nuevos por mes: ene 31 1, feb 31 1" })).toBeInTheDocument();
  });

  it("descarga el CSV y muestra el error si el servidor lo rechaza", async () => {
    api.tendenciasAdmin.mockResolvedValue(datos);
    api.csvTendenciasAdmin.mockRejectedValue(new Error("El periodo no puede superar 2 años."));
    render(<TendenciasAdmin />);
    await screen.findByText("$480.000");
    await userEvent.click(screen.getByRole("button", { name: /Descargar CSV/ }));
    expect(await screen.findByRole("alert")).toHaveTextContent("2 años");
  });

  it("si la consulta falla muestra el error y bloquea la descarga", async () => {
    api.tendenciasAdmin.mockRejectedValue(new Error("Las fechas deben tener el formato AAAA-MM-DD."));
    render(<TendenciasAdmin />);
    expect(await screen.findByRole("alert")).toHaveTextContent("formato");
    expect(screen.getByRole("button", { name: /Descargar CSV/ })).toBeDisabled();
  });
});

describe("AuditoriaAdmin", () => {
  beforeEach(() => { api.auditoriaAdmin.mockReset(); });

  const pagina = (resultados, extra = {}) => ({ total: resultados.length, page: 1, limit: 20, total_paginas: 1, resultados, ...extra });
  const accion = (id, a, detalle) => ({ id, accion: a, detalle, fecha: "2031-03-12T15:30:00.000Z", actor: { id: 1, nombre: "Admin PubliTours" } });

  it("lista cada acción con su autor y detalle", async () => {
    api.auditoriaAdmin.mockResolvedValue(pagina([accion(1, "negocio_rechazado", "Finca X — motivo: Falta el RNT"), accion(2, "usuario_suspendido", "ana@test.com")]));
    render(<AuditoriaAdmin />);
    expect(await screen.findByText("Negocio rechazado", { selector: "span" })).toBeInTheDocument();
    expect(screen.getByText("Finca X — motivo: Falta el RNT")).toBeInTheDocument();
    expect(screen.getByText("Usuario suspendido", { selector: "span" })).toBeInTheDocument();
    expect(screen.getAllByText("Admin PubliTours")).toHaveLength(2);
    expect(api.auditoriaAdmin).toHaveBeenCalledWith({ page: 1, limit: 20 });
  });

  it("filtrar por tipo vuelve a la primera página con ese filtro", async () => {
    api.auditoriaAdmin.mockResolvedValue(pagina([accion(1, "anuncio_enviado", "A todos")]));
    render(<AuditoriaAdmin />);
    await screen.findByText("Anuncio enviado", { selector: "span" });
    await userEvent.selectOptions(screen.getByLabelText("Tipo de acción"), "anuncio_enviado");
    await waitFor(() => expect(api.auditoriaAdmin).toHaveBeenLastCalledWith({ page: 1, limit: 20, accion: "anuncio_enviado" }));
  });

  it("pagina hacia adelante y atrás", async () => {
    api.auditoriaAdmin.mockImplementation(({ page }) => Promise.resolve(pagina([accion(page, "resena_retirada", `página ${page}`)], { page, total: 40, total_paginas: 2 })));
    render(<AuditoriaAdmin />);
    expect(await screen.findByText("página 1")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Anterior" })).toBeDisabled();
    await userEvent.click(screen.getByRole("button", { name: "Siguiente" }));
    expect(await screen.findByText("página 2")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Siguiente" })).toBeDisabled();
    expect(screen.getByText(/Página 2 de 2 · 40 acciones/)).toBeInTheDocument();
  });

  it("sin acciones lo dice", async () => {
    api.auditoriaAdmin.mockResolvedValue(pagina([]));
    render(<AuditoriaAdmin />);
    expect(await screen.findByText("Aún no hay acciones registradas.")).toBeInTheDocument();
  });

  it("muestra un autor eliminado sin romperse", async () => {
    api.auditoriaAdmin.mockResolvedValue(pagina([{ ...accion(1, "resena_retirada", "x"), actor: null }]));
    render(<AuditoriaAdmin />);
    expect(await screen.findByText("Administrador eliminado")).toBeInTheDocument();
  });
});

describe("AnunciosAdmin", () => {
  beforeEach(() => { api.enviarAnuncio.mockReset(); });

  it("no deja enviar un mensaje corto", async () => {
    render(<AnunciosAdmin />);
    const enviar = screen.getByRole("button", { name: /Enviar anuncio/ });
    expect(enviar).toBeDisabled();
    await userEvent.type(screen.getByLabelText(/^Mensaje/), "hola");
    expect(enviar).toBeDisabled();
  });

  it("envía el anuncio a los destinatarios elegidos, informa cuántos y limpia el formulario", async () => {
    api.enviarAnuncio.mockResolvedValue({ enviados: 3 });
    render(<AnunciosAdmin />);
    await userEvent.click(screen.getByRole("radio", { name: /Todos los negocios/ }));
    await userEvent.type(screen.getByLabelText(/^Mensaje/), "  Mañana hay mantenimiento de la plataforma.  ");
    await userEvent.click(screen.getByRole("button", { name: /Enviar anuncio/ }));

    await waitFor(() => expect(api.enviarAnuncio).toHaveBeenCalledWith({ mensaje: "Mañana hay mantenimiento de la plataforma.", destinatarios: "todos" }));
    expect(await screen.findByRole("status")).toHaveTextContent("Anuncio enviado a 3 negocios.");
    expect(screen.getByLabelText(/^Mensaje/)).toHaveValue("");
  });

  it("por defecto va solo a negocios aprobados y muestra el error del servidor", async () => {
    api.enviarAnuncio.mockRejectedValue(new Error("No hay negocios a quienes enviar el anuncio."));
    render(<AnunciosAdmin />);
    expect(screen.getByRole("radio", { name: /Solo negocios aprobados/ })).toBeChecked();
    await userEvent.type(screen.getByLabelText(/^Mensaje/), "Un anuncio suficientemente largo");
    await userEvent.click(screen.getByRole("button", { name: /Enviar anuncio/ }));
    expect(await screen.findByRole("alert")).toHaveTextContent("No hay negocios");
    expect(api.enviarAnuncio).toHaveBeenCalledWith(expect.objectContaining({ destinatarios: "aprobados" }));
  });
});
