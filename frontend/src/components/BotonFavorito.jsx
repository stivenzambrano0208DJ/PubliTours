import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/auth";
import { useFavoritos } from "../context/favoritos";

// Corazón para guardar un sitio en favoritos. Los administradores no lo ven.
export default function BotonFavorito({ sitioId, className = "" }) {
  const { usuario } = useAuth();
  const { esFavorito, alternar } = useFavoritos();
  const navigate = useNavigate();

  if (usuario?.rol === "administrador") return null;
  const activo = !!usuario && esFavorito(sitioId);

  const manejar = (e) => {
    e.stopPropagation();
    e.preventDefault();
    if (!usuario) { navigate("/login"); return; }
    alternar(sitioId);
  };

  return (
    <button
      type="button"
      onClick={manejar}
      aria-pressed={activo}
      aria-label={activo ? "Quitar de favoritos" : "Guardar en favoritos"}
      title={activo ? "Quitar de favoritos" : "Guardar en favoritos"}
      className={`w-9 h-9 rounded-full flex items-center justify-center backdrop-blur-md shadow-sm transition-all ${
        activo ? "bg-error text-on-error" : "bg-surface-container-lowest/90 text-error hover:bg-surface-container-lowest"
      } ${className}`}
    >
      <span aria-hidden="true" className="material-symbols-outlined text-[20px]" style={{ fontVariationSettings: `'FILL' ${activo ? 1 : 0}` }}>favorite</span>
    </button>
  );
}
