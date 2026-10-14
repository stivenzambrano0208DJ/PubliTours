import { createContext, useContext } from "react";

export const FavoritosContext = createContext(null);

export function useFavoritos() {
  const ctx = useContext(FavoritosContext);
  if (!ctx) throw new Error("useFavoritos debe usarse dentro de FavoritosProvider");
  return ctx;
}
