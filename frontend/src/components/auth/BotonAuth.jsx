// Botón principal de los formularios de acceso (enviar, iniciar sesión, restablecer…).
export default function BotonAuth({ cargando, texto, textoCargando }) {
  return (
    <button
      type="submit"
      disabled={cargando}
      className="w-full group flex items-center justify-between pl-6 pr-3 py-3 rounded-2xl bg-gradient-to-r from-primary-container via-primary to-secondary text-on-primary font-title-sm text-title-sm shadow-lg shadow-primary-container/20 active:scale-[0.99] transition-all disabled:opacity-60"
    >
      <span>{cargando ? textoCargando : texto}</span>
      <span className="w-8 h-8 rounded-full bg-white/20 group-hover:bg-white/30 flex items-center justify-center transition-colors">
        <span className="material-symbols-outlined text-[18px]">arrow_forward</span>
      </span>
    </button>
  );
}
