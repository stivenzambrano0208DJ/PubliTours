// Estructura común de las páginas legales (Términos y Privacidad).
export default function PaginaLegal({ titulo, version, children }) {
  return (
    <article className="max-w-3xl mx-auto px-gutter py-space-xl">
      <header className="mb-space-lg">
        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-secondary-container/40 text-secondary font-label-xs text-label-xs font-semibold mb-3">
          <span className="material-symbols-outlined text-[14px]">gavel</span>
          Documento legal
        </span>
        <h1 className="font-headline-xl text-headline-xl text-primary tracking-tight">{titulo}</h1>
        <p className="font-label-md text-label-md text-on-surface-variant mt-2">Versión {version}</p>
      </header>
      <div className="flex flex-col gap-6 font-body-md text-body-md text-on-surface-variant [&_ul]:list-disc [&_ul]:pl-6 [&_ul]:flex [&_ul]:flex-col [&_ul]:gap-1.5 [&_strong]:text-on-surface">
        {children}
      </div>
    </article>
  );
}

export function Seccion({ n, titulo, children }) {
  return (
    <section className="flex flex-col gap-2">
      <h2 className="font-title-lg text-title-lg text-on-surface font-semibold">{n}. {titulo}</h2>
      {children}
    </section>
  );
}
