import { useState } from "react";
import { api } from "../api/client";
import { fechaMinima } from "../constants";

const FORMULARIO_INICIAL = () => ({ presupuesto: "", dias: "", personas: 1, fecha_inicio: fechaMinima(), preferencias: [], municipio: "" });

// Formulario del generador: lo que escribe el turista, lo que entiende la IA y el itinerario que devuelve el servidor.
export function useGeneradorItinerario() {
  const [form, setForm] = useState(FORMULARIO_INICIAL);
  const [itinerario, setItinerario] = useState(null);
  const [error, setError] = useState("");
  const [cargando, setCargando] = useState(false);

  const toggleInteres = (interes) => {
    setForm((prev) => ({
      ...prev,
      preferencias: prev.preferencias.includes(interes) ? prev.preferencias.filter((i) => i !== interes) : [...prev.preferencias, interes],
    }));
  };

  // Lo que la IA entendió rellena el formulario (solo los datos detectados); el turista revisa y confirma.
  // Todo lo demás (fecha de inicio, personas, lo ya escrito) se conserva.
  const aplicarInterpretacion = (r) => {
    setForm((prev) => ({
      ...prev,
      presupuesto: r.presupuesto ? String(r.presupuesto) : prev.presupuesto,
      dias: r.dias ? String(r.dias) : prev.dias,
      preferencias: r.preferencias.length ? r.preferencias : prev.preferencias,
      municipio: r.municipio || prev.municipio,
    }));
  };

  const generar = async (e) => {
    e.preventDefault();
    setError("");
    setCargando(true);
    try {
      setItinerario(await api.generarItinerario({
        presupuesto: Number(form.presupuesto),
        dias: Number(form.dias),
        preferencias: form.preferencias.join(","),
        municipio: form.municipio,
        personas: Number(form.personas) || 1,
        fecha_inicio: form.fecha_inicio,
      }));
    } catch (err) {
      setError(err.message);
      setItinerario(null);
    } finally {
      setCargando(false);
    }
  };

  return { form, setForm, toggleInteres, aplicarInterpretacion, generar, itinerario, volver: () => setItinerario(null), error, cargando };
}
