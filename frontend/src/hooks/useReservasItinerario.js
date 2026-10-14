import { useState } from "react";
import { api } from "../api/client";
import { fechaDelDia, fechaCorta } from "../utils/fechas";

// Reservar las actividades de un itinerario, una por una o todas, cada una en la fecha real de su día.
// Un fallo en una actividad no detiene las demás: se informa al final cuáles no se pudieron reservar.
export function useReservasItinerario({ itinerario, fechaInicio, personas }) {
  const [reservando, setReservando] = useState(null);
  const [reservados, setReservados] = useState(new Set());
  const [mensaje, setMensaje] = useState("");

  const marcar = (id) => setReservados((prev) => new Set(prev).add(id));
  const solicitar = (item) => api.solicitarReserva({ sitio_id: item.sitio.id, fecha_servicio: fechaDelDia(fechaInicio, item.dia), personas });

  const reservarItem = async (item) => {
    setReservando(item.id);
    setMensaje("");
    try {
      await solicitar(item);
      marcar(item.id);
      setMensaje(`Solicitud enviada para "${item.sitio.nombre}" el ${fechaCorta(fechaDelDia(fechaInicio, item.dia))} (${personas} persona${personas === 1 ? "" : "s"}). Consulta el estado en Mis Reservas.`);
    } catch (err) {
      setMensaje(`Error al reservar "${item.sitio.nombre}": ${err.message}`);
    } finally {
      setReservando(null);
    }
  };

  const reservarTodo = async () => {
    const pendientes = itinerario.items.filter((i) => !reservados.has(i.id));
    setMensaje("Reservando todo el itinerario...");
    let ok = 0;
    const fallos = [];
    for (const item of pendientes) {
      try {
        await solicitar(item);
        marcar(item.id);
        ok++;
      } catch (err) {
        fallos.push(`"${item.sitio.nombre}" (${fechaCorta(fechaDelDia(fechaInicio, item.dia))}): ${err.message}`);
      }
    }
    setMensaje(
      `${ok} de ${pendientes.length} solicitudes de reserva enviadas. Consulta el estado en Mis Reservas.` +
      (fallos.length ? ` No se pudieron reservar: ${fallos.join(" · ")}` : "")
    );
  };

  return { reservando, reservados, mensaje, reservarItem, reservarTodo, todoReservado: reservados.size === itinerario.items.length };
}
