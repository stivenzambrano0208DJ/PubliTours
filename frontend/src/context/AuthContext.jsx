import { useEffect, useState } from "react";
import { api, marcarSesion, haySesion, EVENTO_SESION_EXPIRADA } from "../api/client";
import { AuthContext } from "./auth";

export function AuthProvider({ children }) {
  const [usuario, setUsuario] = useState(null);
  const [cargando, setCargando] = useState(haySesion); // sin sesión recordada no hay nada que consultar

  useEffect(() => {
    if (!haySesion()) return;
    api.me()
      .then(setUsuario)
      .catch(() => { marcarSesion(false); setUsuario(null); }) // la cookie ya no vale (venció o se cerró en otro lado)
      .finally(() => setCargando(false));
  }, []);

  // El servidor rechazó la sesión (venció o se cerró la sesión desde otro lado): se vuelve a visitante y las rutas protegidas piden iniciar sesión.
  useEffect(() => {
    const alVencer = () => setUsuario(null);
    window.addEventListener(EVENTO_SESION_EXPIRADA, alVencer);
    return () => window.removeEventListener(EVENTO_SESION_EXPIRADA, alVencer);
  }, []);

  const login = (u) => {
    marcarSesion(true);
    setUsuario(u);
  };
  const actualizarUsuario = (cambios) => setUsuario((prev) => ({ ...prev, ...cambios }));
  const logout = () => {
    marcarSesion(false);
    setUsuario(null);
    api.logout().catch(() => {}); // el servidor borra la cookie HttpOnly; si no hay red, la sesión local ya quedó cerrada
  };

  return (
    <AuthContext.Provider value={{ usuario, login, logout, actualizarUsuario, cargando }}>
      {children}
    </AuthContext.Provider>
  );
}
