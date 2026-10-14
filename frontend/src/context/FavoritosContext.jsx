import { useCallback, useEffect, useState } from "react";
import { api } from "../api/client";
import { useAuth } from "./auth";
import { FavoritosContext } from "./favoritos";

const SIN_FAVORITOS = new Set();

// Ids de los sitios favoritos del usuario (turista o prestador), compartidos por Explorar, Detalle y Perfil.
export function FavoritosProvider({ children }) {
  const { usuario } = useAuth();
  const [guardados, setIds] = useState(SIN_FAVORITOS);
  const puedeUsar = usuario?.rol === "turista" || usuario?.rol === "prestador";
  const ids = puedeUsar ? guardados : SIN_FAVORITOS;

  useEffect(() => {
    if (!puedeUsar) return undefined;
    api.misFavoritos().then((lista) => setIds(new Set(lista.map((s) => s.id)))).catch(() => {});
    return () => setIds(SIN_FAVORITOS); // al cambiar de usuario no se arrastran los favoritos del anterior
  }, [puedeUsar, usuario?.id]);

  const alternar = useCallback(async (sitioId) => {
    const era = ids.has(sitioId);
    setIds((prev) => { const n = new Set(prev); if (era) n.delete(sitioId); else n.add(sitioId); return n; });
    try {
      if (era) await api.quitarFavorito(sitioId);
      else await api.agregarFavorito(sitioId);
    } catch {
      setIds((prev) => { const n = new Set(prev); if (era) n.add(sitioId); else n.delete(sitioId); return n; }); // revierte
    }
  }, [ids]);

  return (
    <FavoritosContext.Provider value={{ ids, esFavorito: (id) => ids.has(id), alternar, puedeUsar }}>
      {children}
    </FavoritosContext.Provider>
  );
}
