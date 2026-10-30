import { useState } from "react";
import { api } from "../api/client";
import { fechaMinima } from "../constants";

// Estado y envío de una solicitud de reserva de un servicio, compartido por la columna de reserva de la página del sitio y la ventana
// de reserva rápida de Explorar: los valores del formulario, si se está enviando, si ya se envió y el error del servidor.
//  - enviar(e): evita el envío nativo del formulario, manda la solicitud y deja `enviada` o `error` según el resultado.
export function useSolicitudReserva(sitio) {
  const [valores, setValores] = useState({ fecha: fechaMinima(), personas: 1, ninos: 0, nota: "" });
  const [enviando, setEnviando] = useState(false);
  const [enviada, setEnviada] = useState(false);
  const [error, setError] = useState("");

  const enviar = async (e) => {
    e.preventDefault();
    setEnviando(true);
    setError("");
    try {
      await api.solicitarReserva({
        sitio_id: sitio.id, fecha_servicio: valores.fecha, personas: Number(valores.personas) || 1, ninos: Number(valores.ninos) || 0, nota: valores.nota,
      });
      setEnviada(true);
    } catch (err) {
      setError(err.message);
    } finally {
      setEnviando(false);
    }
  };

  return { valores, setValores, enviando, enviada, error, enviar };
}
