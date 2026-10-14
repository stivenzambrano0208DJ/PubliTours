import { FILTROS_RESERVA } from "../../utils/estadosReserva";

// Chips por estado (cada uno con su cantidad real) y búsqueda por servicio, municipio o prestador.
export default function FiltrosReservas({ filtro, onFiltro, conteos, busqueda, onBusqueda }) {
  return (
    <div className="bg-surface-container-lowest rounded-2xl p-space-md shadow-[0_4px_24px_-4px_rgba(6,78,59,0.06)] flex flex-col xl:flex-row items-stretch xl:items-center justify-between gap-space-md">
      <div className="flex items-center gap-space-xs overflow-x-auto pb-space-xs xl:pb-0">
        {FILTROS_RESERVA.map((f) => (
          <button
            key={f.value}
            onClick={() => onFiltro(f.value)}
            className={`px-space-md py-space-xs rounded-full font-label-md text-label-md transition-all flex items-center gap-space-xs whitespace-nowrap ${
              filtro === f.value ? "bg-primary-container text-on-primary shadow-sm" : "text-on-surface-variant hover:bg-surface-container-high"
            }`}
          >
            <span>{f.label}</span>
            <span className="text-label-xs font-label-xs opacity-80">{conteos[f.value]}</span>
          </button>
        ))}
      </div>
      <div className="relative flex-1 sm:w-64 xl:max-w-xs">
        <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-outline text-[18px]">search</span>
        <input
          className="w-full pl-9 pr-3 py-2 bg-surface-container rounded-xl font-body-sm text-body-sm text-on-surface placeholder:text-outline focus:outline-none focus:bg-surface-container-low transition-colors"
          placeholder="Buscar por sitio, municipio o prestador..."
          type="text"
          value={busqueda}
          onChange={(e) => onBusqueda(e.target.value)}
        />
      </div>
    </div>
  );
}
