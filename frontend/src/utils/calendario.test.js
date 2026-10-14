import { describe, it, expect, vi } from "vitest";
import { generarIcs, descargarIcs } from "./calendario";

const reserva = (extra = {}) => ({
  id: 7, codigo: "PT-ABC234", fecha_servicio: "2031-03-12", personas: 2,
  sitio: { nombre: "Cascada La Gloria", municipio: "Florencia" },
  prestador: { nombre_negocio: "BioParque" }, paquete: null, ...extra,
});
const AHORA = new Date("2031-03-01T15:30:45.123Z");

describe("generarIcs", () => {
  it("arma un evento de día completo con el código y la ubicación", () => {
    const ics = generarIcs(reserva(), AHORA);
    expect(ics.startsWith("BEGIN:VCALENDAR\r\n")).toBe(true);
    expect(ics.endsWith("END:VCALENDAR\r\n")).toBe(true);
    expect(ics).toContain("UID:reserva-7@publitours");
    expect(ics).toContain("DTSTAMP:20310301T153045Z");
    expect(ics).toContain("DTSTART;VALUE=DATE:20310312");
    expect(ics).toContain("DTEND;VALUE=DATE:20310313");
    expect(ics).toContain("SUMMARY:Cascada La Gloria");
    expect(ics).toContain("LOCATION:Florencia\\, Caquetá\\, Colombia");
    expect(ics).toContain("PT-ABC234");
    expect(ics).toContain("TRIGGER:-P1D"); // recordatorio un día antes
  });

  it("el día siguiente cruza fin de mes y de año", () => {
    expect(generarIcs(reserva({ fecha_servicio: "2031-01-31" }), AHORA)).toContain("DTEND;VALUE=DATE:20310201");
    expect(generarIcs(reserva({ fecha_servicio: "2031-12-31" }), AHORA)).toContain("DTEND;VALUE=DATE:20320101");
    expect(generarIcs(reserva({ fecha_servicio: "2032-02-28" }), AHORA)).toContain("DTEND;VALUE=DATE:20320229"); // año bisiesto
  });

  it("escapa comas, punto y coma, barras y saltos de línea en los textos", () => {
    const ics = generarIcs(reserva({ sitio: { nombre: "Río; Hermoso, \\ Sur", municipio: "Belén" } }), AHORA);
    expect(ics).toContain("SUMMARY:Río\\; Hermoso\\, \\\\ Sur");
    expect(ics).toContain("\\n"); // la descripción separa sus líneas con \n escapado
  });

  it("un paquete usa su nombre y lista lo que incluye", () => {
    const ics = generarIcs(reserva({ paquete: { nombre: "Aventura total", items: [{ sitio: { nombre: "Cueva" } }, { sitio: { nombre: "Rafting" } }] } }), AHORA);
    expect(ics).toContain("SUMMARY:Aventura total");
    expect(ics).toContain("Incluye: Cueva + Rafting");
  });

  it("sin datos opcionales no deja líneas vacías ni la palabra undefined", () => {
    const ics = generarIcs({ id: 1, fecha_servicio: "2031-03-12", personas: 1 }, AHORA);
    expect(ics).not.toContain("undefined");
    expect(ics).not.toContain("LOCATION");
    expect(ics).toContain("SUMMARY:Reserva en Caquetá");
  });

  it("ninguna línea supera los 75 octetos y todas terminan en CRLF", () => {
    const largo = "Una descripción muy larga con acentos áéíóú ñ ".repeat(8);
    const ics = generarIcs(reserva({ sitio: { nombre: largo, municipio: "Florencia" } }), AHORA);
    const codificador = new TextEncoder();
    for (const linea of ics.split("\r\n")) expect(codificador.encode(linea).length).toBeLessThanOrEqual(75);
    expect(ics.replace(/\r\n/g, "").includes("\n")).toBe(false);
    // al desplegar (quitar CRLF + espacio) el texto vuelve completo
    expect(ics.replace(/\r\n /g, "")).toContain(`SUMMARY:${largo.trim() === largo ? largo : largo}`);
  });
});

describe("descargarIcs", () => {
  it("crea un archivo reserva-<id>.ics y libera el enlace temporal", () => {
    const crear = vi.fn(() => "blob:fake");
    const liberar = vi.fn();
    const clic = vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(function () { this.dataset.nombre = this.download; });
    URL.createObjectURL = crear;
    URL.revokeObjectURL = liberar;
    descargarIcs(reserva());
    expect(crear).toHaveBeenCalledTimes(1);
    expect(crear.mock.calls[0][0].type).toBe("text/calendar;charset=utf-8");
    expect(clic).toHaveBeenCalledTimes(1);
    expect(clic.mock.contexts[0].download).toBe("reserva-7.ics");
    expect(liberar).toHaveBeenCalledWith("blob:fake");
    expect(document.querySelector("a[download]")).toBeNull(); // no deja el enlace en la página
    clic.mockRestore();
  });
});
