import { useState } from "react";
import { api } from "../api/client";
import { fechaDelDia, fechaCorta } from "../utils/fechas";
import { useIdioma } from "../context/idioma";

// Reservar las actividades de un itinerario, una por una o todas, cada una en la fecha real de su día.
// Un fallo en una actividad no detiene las demás: se informa al final cuáles no se pudieron reservar.
export function useReservasItinerario({ itinerario, fechaInicio, personas }) {
  const { t, locale } = useIdioma();
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
      setMensaje(t("Solicitud enviada para \"{nombre}\" el {fecha} ({personas}). Consulta el estado en Mis Reservas.", { nombre: item.sitio.nombre, fecha: fechaCorta(fechaDelDia(fechaInicio, item.dia), locale), personas: (personas === 1 ? t("1 persona", { n: personas }) : t("{n} personas", { n: personas })) }));
    } catch (err) {
      setMensaje(t("Error al reservar \"{nombre}\": {error}", { nombre: item.sitio.nombre, error: err.message }));
    } finally {
      setReservando(null);
    }
  };

  const reservarTodo = async () => {
    const pendientes = itinerario.items.filter((i) => !reservados.has(i.id));
    setMensaje(t("Reservando todo el itinerario..."));
    let ok = 0;
    const fallos = [];
    for (const item of pendientes) {
      try {
        await solicitar(item);
        marcar(item.id);
        ok++;
      } catch (err) {
        fallos.push(`"${item.sitio.nombre}" (${fechaCorta(fechaDelDia(fechaInicio, item.dia), locale)}): ${err.message}`);
      }
    }
    setMensaje(
      t("{ok} de {total} solicitudes de reserva enviadas. Consulta el estado en Mis Reservas.", { ok, total: pendientes.length }) +
      (fallos.length ? ` ${t("No se pudieron reservar: {lista}", { lista: fallos.join(" · ") })}` : "")
    );
  };

  return { reservando, reservados, mensaje, reservarItem, reservarTodo, todoReservado: reservados.size === itinerario.items.length };
}
