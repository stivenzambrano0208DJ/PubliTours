import { api } from "../api/client";
import { useAuth } from "../context/auth";
import { useConsulta } from "./useConsulta";

// ¿El servicio es de mi propio negocio? Un prestador no reserva lo suyo. Se reconoce por el negocio (id), no por el nombre de la persona.
export function useEsServicioPropio(sitio) {
  const { usuario } = useAuth();
  const aplica = usuario?.rol === "prestador" && Boolean(sitio?.Prestador);
  const { datos: perfil } = useConsulta(`perfil-${usuario?.id}`, () => api.miPerfilPrestador(), aplica);
  return aplica && perfil?.id === sitio.Prestador.id;
}
