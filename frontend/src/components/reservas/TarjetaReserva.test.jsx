import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import TarjetaReserva from "./TarjetaReserva";
import { sumarDias, hoyISO } from "../../utils/fechas";
import * as calendario from "../../utils/calendario";

// El botón de preguntar tiene su propia prueba; aquí solo interesa cuándo se ofrece y con qué tema.
vi.mock("../mensajes/BotonPreguntar", () => ({ default: ({ tema, etiqueta, nombre }) => <button data-tema={JSON.stringify(tema)} data-nombre={nombre}>{etiqueta}</button> }));

const reserva = (estado, dias, extra = {}) => ({
  id: 5, estado, fecha_servicio: sumarDias(hoyISO(), dias), fecha_solicitud: "2031-01-05T10:00:00Z", personas: 2, total: "50000", codigo: "PT-AAAA05",
  sitio: { nombre: "Cascada", municipio: "Florencia", categoria: "naturaleza" }, prestador: { nombre_negocio: "BioParque" }, ...extra,
});
const montar = (r) => render(<MemoryRouter><TarjetaReserva reserva={r} onEditar={() => {}} onCancelar={() => {}} onCalificar={() => {}} /></MemoryRouter>);

describe("TarjetaReserva: escribir al negocio", () => {
  it.each(["pendiente", "confirmada", "completada"])("una reserva %s permite escribirle al negocio sobre esa reserva", (estado) => {
    montar(reserva(estado, 10));
    const boton = screen.getByRole("button", { name: "Escribir al negocio" });
    expect(JSON.parse(boton.dataset.tema)).toEqual({ reserva_id: 5 });
    expect(boton.dataset.nombre).toBe("Cascada");
  });

  it.each(["cancelada", "rechazada", "no_asistio"])("una reserva %s ya no ofrece escribir", (estado) => {
    montar(reserva(estado, 10));
    expect(screen.queryByRole("button", { name: "Escribir al negocio" })).toBeNull();
  });

  it("en una reserva de un paquete usa el nombre del paquete", () => {
    montar(reserva("confirmada", 10, { paquete: { nombre: "Aventura total", items: [] } }));
    expect(screen.getByRole("button", { name: "Escribir al negocio" }).dataset.nombre).toBe("Aventura total");
  });
});

describe("TarjetaReserva: agregar al calendario", () => {
  beforeEach(() => { vi.restoreAllMocks(); });

  it("una reserva confirmada y futura se puede agregar al calendario", async () => {
    const descargar = vi.spyOn(calendario, "descargarIcs").mockImplementation(() => {});
    const r = reserva("confirmada", 10);
    montar(r);
    await userEvent.click(screen.getByRole("button", { name: /Agregar al calendario/ }));
    expect(descargar).toHaveBeenCalledWith(r);
  });

  it.each([
    ["pendiente", 10], // aún no hay nada seguro que agendar
    ["cancelada", 10],
    ["rechazada", 10],
    ["confirmada", -3], // ya pasó
    ["completada", -3],
  ])("no se ofrece en una reserva %s con fecha a %i días", (estado, dias) => {
    montar(reserva(estado, dias));
    expect(screen.queryByRole("button", { name: /Agregar al calendario/ })).toBeNull();
  });
});
