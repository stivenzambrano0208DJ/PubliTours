import { Link } from "react-router-dom";

export default function NotFound() {
  return (
    <div className="max-w-[1360px] mx-auto px-gutter py-24 flex flex-col items-center text-center gap-4">
      <span className="material-symbols-outlined text-secondary text-[64px]">explore_off</span>
      <h1 className="font-display-lg-mobile md:font-display-lg text-display-lg-mobile md:text-display-lg text-primary tracking-tight">404</h1>
      <h2 className="font-headline-md text-headline-md text-on-surface">No encontramos esta página</h2>
      <p className="font-body-md text-body-md text-on-surface-variant max-w-md">
        La ruta que buscas no existe o fue movida. Verifica la URL o vuelve al inicio para seguir explorando el Caquetá.
      </p>
      <Link
        to="/"
        className="mt-2 inline-flex items-center gap-2 px-space-lg py-3 rounded-xl bg-primary text-on-primary font-label-md text-label-md hover:bg-primary-container transition-colors"
      >
        <span className="material-symbols-outlined text-[18px]">home</span>
        Volver al inicio
      </Link>
    </div>
  );
}
