import { Link } from "react-router-dom";

// Quién ofrece el servicio, con acceso a su página y, si dejó un teléfono, a su WhatsApp.
export default function TarjetaPrestador({ prestador }) {
  return (
    <section className="p-6 rounded-3xl bg-surface-container-low shadow-sm flex flex-col sm:flex-row sm:items-center gap-5">
      <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-primary-container to-secondary flex items-center justify-center text-on-primary shrink-0">
        <span className="material-symbols-outlined text-[26px]">storefront</span>
      </div>
      <div className="flex flex-col gap-1 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <h3 className="font-title-lg text-title-lg text-primary font-bold">
            <Link to={`/negocios/${prestador.id}`} className="hover:text-secondary hover:underline transition-colors">{prestador.nombre_negocio}</Link>
          </h3>
          {prestador.estado_verificacion === "aprobado" && (
            <span className="px-2.5 py-0.5 rounded-full bg-secondary-container/50 text-secondary font-label-xs text-label-xs font-semibold">Verificado</span>
          )}
        </div>
        <p className="font-body-sm text-body-sm text-on-surface-variant flex items-center gap-1">
          <span className="material-symbols-outlined text-[16px]">location_on</span>
          {prestador.municipio}
        </p>
      </div>
      <Link
        to={`/negocios/${prestador.id}`}
        className="inline-flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl bg-surface-container text-primary hover:bg-surface-container-high font-label-md text-label-md font-semibold transition-colors shrink-0"
      >
        <span className="material-symbols-outlined text-[18px]">storefront</span>
        Ver negocio
      </Link>
      {prestador.telefono && (
        <a
          href={`https://wa.me/57${prestador.telefono}`}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl bg-secondary text-on-secondary hover:bg-secondary-container hover:text-on-secondary-container font-label-md text-label-md font-semibold transition-all shrink-0"
        >
          <span className="material-symbols-outlined text-[18px]">chat</span>
          Escribir por WhatsApp
        </a>
      )}
    </section>
  );
}
