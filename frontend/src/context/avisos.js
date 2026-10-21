import { createContext, useContext } from "react";

// Avisos y confirmaciones de la aplicación (reemplazan a alert() y confirm() del navegador, que bloquean la página, no se ven igual en
// todos los celulares y no se pueden estilizar ni leer bien con lector de pantalla).
//   avisar(mensaje, tipo = "error")  — tipo: "error" | "ok" | "info". No espera ninguna respuesta.
//   confirmar(mensaje, { titulo, confirmar, cancelar, peligro }) — devuelve una promesa que vale true si la persona acepta.
// Si un componente se monta sin AvisosProvider (por ejemplo en una prueba aislada), se usan los diálogos del navegador: así nada se rompe.
const RESPALDO = {
  avisar: (mensaje) => window.alert(mensaje),
  confirmar: (mensaje) => Promise.resolve(window.confirm(mensaje)),
};

export const AvisosContext = createContext(null);

export function useAvisos() {
  return useContext(AvisosContext) || RESPALDO;
}
