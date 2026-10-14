// Logo y nombre de la plataforma que encabeza las pantallas de acceso.
export default function MarcaAuth({ className = "mb-6" }) {
  return (
    <div className={`flex items-center gap-2.5 ${className}`}>
      <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-primary-container to-secondary flex items-center justify-center shadow-md shrink-0">
        <span className="material-symbols-outlined text-on-primary text-[18px]">forest</span>
      </div>
      <div className="flex items-baseline gap-1.5">
        <span className="font-title-lg text-title-lg tracking-tight text-on-surface">PubliTours</span>
        <span className="inline-flex items-center px-1.5 py-0.5 rounded font-label-xs text-label-xs font-bold uppercase bg-secondary-container/40 text-secondary">
          Vive IA
        </span>
      </div>
    </div>
  );
}
