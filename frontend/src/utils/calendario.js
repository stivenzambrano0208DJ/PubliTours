// Archivo .ics (iCalendar, RFC 5545) de una reserva, para añadirla al calendario del celular o del computador.
// Se arma en el navegador con los datos que la persona ya está viendo; no pasa por el servidor.

const escapar = (texto) => String(texto ?? "").replace(/\\/g, "\\\\").replace(/;/g, "\\;").replace(/,/g, "\\,").replace(/\r?\n/g, "\\n");

// Las líneas largas se parten a 75 octetos (en bytes UTF-8, sin cortar un carácter) y la continuación empieza con un espacio.
function plegar(linea) {
  const codificador = new TextEncoder();
  const partes = [];
  let actual = "";
  let bytes = 0;
  let limite = 75;
  for (const caracter of linea) {
    const largo = codificador.encode(caracter).length;
    if (bytes + largo > limite) {
      partes.push(actual);
      actual = " ";
      bytes = 1;
      limite = 75;
    }
    actual += caracter;
    bytes += largo;
  }
  partes.push(actual);
  return partes.join("\r\n");
}

const soloDigitos = (fechaISO) => fechaISO.replaceAll("-", "");

// Día siguiente a una fecha AAAA-MM-DD (en un evento de día completo, DTEND es el día después del último día).
function diaSiguiente(fechaISO) {
  const [a, m, d] = fechaISO.split("-").map(Number);
  const f = new Date(Date.UTC(a, m - 1, d + 1));
  return f.toISOString().slice(0, 10);
}

const marcaUtc = (fecha) => fecha.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");

export function generarIcs(reserva, ahora = new Date()) {
  const nombre = reserva.paquete?.nombre || reserva.sitio?.nombre || "Reserva en Caquetá";
  const municipio = reserva.sitio?.municipio;
  const descripcion = [
    `Reserva PubliTours #${reserva.id}`,
    reserva.codigo ? `Código de comprobante: ${reserva.codigo}` : null,
    `Personas: ${reserva.personas}`,
    reserva.prestador?.nombre_negocio ? `Prestador: ${reserva.prestador.nombre_negocio}` : null,
    reserva.paquete?.items?.length ? `Incluye: ${reserva.paquete.items.map((i) => i.sitio?.nombre).filter(Boolean).join(" + ")}` : null,
  ].filter(Boolean).join("\n");

  const lineas = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//PubliTours//Caqueta Vive IA//ES",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    "BEGIN:VEVENT",
    `UID:reserva-${reserva.id}@publitours`,
    `DTSTAMP:${marcaUtc(ahora)}`,
    `DTSTART;VALUE=DATE:${soloDigitos(reserva.fecha_servicio)}`,
    `DTEND;VALUE=DATE:${soloDigitos(diaSiguiente(reserva.fecha_servicio))}`,
    `SUMMARY:${escapar(nombre)}`,
    ...(municipio ? [`LOCATION:${escapar(`${municipio}, Caquetá, Colombia`)}`] : []),
    `DESCRIPTION:${escapar(descripcion)}`,
    "TRANSP:TRANSPARENT",
    "BEGIN:VALARM",
    "ACTION:DISPLAY",
    `DESCRIPTION:${escapar(`Mañana: ${nombre}`)}`,
    "TRIGGER:-P1D",
    "END:VALARM",
    "END:VEVENT",
    "END:VCALENDAR",
  ];
  return lineas.map(plegar).join("\r\n") + "\r\n";
}

// Descarga el .ics como archivo (el navegador lo abre con la aplicación de calendario del dispositivo).
export function descargarIcs(reserva) {
  const blob = new Blob([generarIcs(reserva)], { type: "text/calendar;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const enlace = document.createElement("a");
  enlace.href = url;
  enlace.download = `reserva-${reserva.id}.ics`;
  document.body.appendChild(enlace);
  enlace.click();
  enlace.remove();
  URL.revokeObjectURL(url);
}
