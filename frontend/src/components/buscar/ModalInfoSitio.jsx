import { useNavigate } from "react-router-dom";

const CAMPO = "p-3 rounded-xl bg-surface-container-low";

// Ficha completa del servicio para el administrador (que no reserva): datos clave y acceso al panel de moderación.
export default function ModalInfoSitio({ sitio, onCerrar }) {
  const navigate = useNavigate();
  return (
    <div className="fixed inset-0 bg-black/40 z-[60] flex items-center justify-center p-4" onClick={onCerrar}>
      <div onClick={(e) => e.stopPropagation()} className="w-full max-w-md bg-surface-container-lowest rounded-2xl p-6 shadow-xl flex flex-col gap-3 max-h-[85vh] overflow-y-auto">
        <div className="flex items-start justify-between gap-2">
          <div>
            <h3 className="font-headline-md text-headline-md text-primary">{sitio.nombre}</h3>
            <p className="font-body-sm text-body-sm text-on-surface-variant flex items-center gap-1 mt-1">
              <span className="material-symbols-outlined text-[16px]">location_on</span>
              {sitio.municipio}
            </p>
          </div>
          <span className={`px-3 py-1 rounded-full font-label-xs text-label-xs font-semibold shrink-0 ${
            sitio.estado === "activo" ? "bg-secondary-container/40 text-secondary" : "bg-surface-container text-on-surface-variant"
          }`}>
            {sitio.estado}
          </span>
        </div>

        <div className="grid grid-cols-2 gap-3 py-2">
          <div className={CAMPO}>
            <p className="font-label-xs text-label-xs text-on-surface-variant uppercase">Categoría</p>
            <p className="font-title-sm text-title-sm text-on-surface">{sitio.categoria}</p>
          </div>
          <div className={CAMPO}>
            <p className="font-label-xs text-label-xs text-on-surface-variant uppercase">Precio</p>
            <p className="font-title-sm text-title-sm text-on-surface">
              {Number(sitio.precio) === 0 ? "Gratuito" : `$${Number(sitio.precio).toLocaleString("es-CO")} COP`}
            </p>
          </div>
          <div className={CAMPO}>
            <p className="font-label-xs text-label-xs text-on-surface-variant uppercase">Horario</p>
            <p className="font-title-sm text-title-sm text-on-surface">{sitio.horario || "No registrado"}</p>
          </div>
          <div className={CAMPO}>
            <p className="font-label-xs text-label-xs text-on-surface-variant uppercase">Tipo de viaje</p>
            <p className="font-title-sm text-title-sm text-on-surface">{sitio.tipo_viaje || "No registrado"}</p>
          </div>
        </div>

        <div>
          <p className="font-label-xs text-label-xs text-on-surface-variant uppercase mb-1">Descripción</p>
          <p className="font-body-sm text-body-sm text-on-surface">{sitio.descripcion || "Sin descripción disponible."}</p>
        </div>

        <div className="flex items-center gap-2 mt-2">
          <button onClick={onCerrar} className="flex-1 py-2.5 rounded-xl bg-surface-container text-on-surface font-label-md text-label-md hover:bg-surface-container-high transition-colors">
            Cerrar
          </button>
          <button onClick={() => navigate("/admin")} className="flex-1 py-2.5 rounded-xl bg-primary text-on-primary font-label-md text-label-md hover:bg-primary-container transition-colors">
            Ir al Panel Admin
          </button>
        </div>
      </div>
    </div>
  );
}
