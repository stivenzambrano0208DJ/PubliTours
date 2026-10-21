import { useEffect, useMemo, useState } from "react";
import { api } from "../api/client";
import { useConfiguracion } from "./useConfiguracion";
import { FILTROS_RESERVA } from "../utils/estadosReserva";
import { hoyISO } from "../utils/fechas";
import { NOMBRES_POLITICA, seriaTardia, textoDias } from "../utils/politicas";
import { useAvisos } from "../context/avisos";

// Las reservas del turista: lista, filtros, búsqueda, cifras del encabezado y cancelación.
export function useMisReservas() {
  const { avisar, confirmar } = useAvisos();
  const configuracion = useConfiguracion();
  const [reservas, setReservas] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState("");
  const [filtro, setFiltro] = useState("todas");
  const [busqueda, setBusqueda] = useState("");
  const [cancelando, setCancelando] = useState(null);

  useEffect(() => {
    api.misReservas()
      .then(setReservas)
      .catch((err) => setError(err.message))
      .finally(() => setCargando(false));
  }, []);

  // Una cifra por cada filtro (todas las reservas y cada estado).
  const conteos = useMemo(() => Object.fromEntries(
    FILTROS_RESERVA.map(({ value }) => [value, value === "todas" ? reservas.length : reservas.filter((r) => r.estado === value).length])
  ), [reservas]);

  // La confirmada más cercana que todavía no pasó.
  const proximaReserva = useMemo(() => reservas
    .filter((r) => r.estado === "confirmada" && r.fecha_servicio >= hoyISO())
    .sort((a, b) => new Date(a.fecha_servicio) - new Date(b.fecha_servicio))[0] || null, [reservas]);

  const totalConfirmado = useMemo(
    () => reservas.filter((r) => r.estado === "confirmada" || r.estado === "completada").reduce((suma, r) => suma + Number(r.total || 0), 0),
    [reservas]
  );

  const visibles = useMemo(() => {
    const q = busqueda.toLowerCase().trim();
    return reservas.filter((r) => {
      const texto = `${r.paquete?.nombre || r.sitio?.nombre} ${r.sitio?.municipio} ${r.prestador?.nombre_negocio || ""}`.toLowerCase();
      return (filtro === "todas" || r.estado === filtro) && (!q || texto.includes(q));
    });
  }, [reservas, filtro, busqueda]);

  // Aplica cambios a una reserva ya cargada (lo que devuelve el servidor tras editarla, cancelarla o calificarla).
  const actualizar = (id, cambios) => setReservas((prev) => prev.map((r) => (r.id === id ? { ...r, ...cambios } : r)));

  // Si cancelar ahora sería "tardío" según la política de la reserva, se avisa antes de confirmar.
  const cancelar = async (r) => {
    const plazos = configuracion?.politicas_cancelacion;
    const tardia = r.estado === "confirmada" && seriaTardia(plazos, r.politica_cancelacion, r.fecha_servicio);
    const aviso = tardia
      ? ` Su política de cancelación (${NOMBRES_POLITICA[r.politica_cancelacion].toLowerCase()}) pide ${textoDias(plazos[r.politica_cancelacion])} de antelación: se registrará como cancelación tardía.`
      : "";
    if (!(await confirmar(`¿Cancelar tu reserva en "${r.paquete?.nombre || r.sitio?.nombre}" del ${r.fecha_servicio}?${aviso} Esta acción no se puede deshacer.`, { titulo: "Cancelar reserva", confirmar: "Sí, cancelar", cancelar: "No, volver", peligro: true }))) return;
    setCancelando(r.id);
    try {
      const { estado, cancelacion_tardia } = await api.cancelarReserva(r.id);
      actualizar(r.id, { estado, cancelacion_tardia });
    } catch (err) {
      avisar(err.message);
    } finally {
      setCancelando(null);
    }
  };

  return {
    reservas, visibles, cargando, error, conteos, proximaReserva, totalConfirmado,
    filtro, setFiltro, busqueda, setBusqueda,
    cancelando, cancelar, actualizar,
    diasGracia: configuracion?.dias_gracia_asistencia,
  };
}
