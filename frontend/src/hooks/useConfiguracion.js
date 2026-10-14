import { api } from "../api/client";
import { useConsulta } from "./useConsulta";

// Reglas del modelo de negocio según el servidor (comisión y días de cada política de cancelación):
// una sola fuente para que los textos de la página no se contradigan con lo que aplica el backend. null mientras carga o si falla.
export function useConfiguracion() {
  return useConsulta("configuracion", () => api.configuracion()).datos;
}
