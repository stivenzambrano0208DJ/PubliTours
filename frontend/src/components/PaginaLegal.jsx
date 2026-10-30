import { useIdioma } from "../context/idioma";
import Insignia from "./ui/Insignia";

// Páginas que solo existen en español (los documentos legales, la ayuda y la guía para negocios). En inglés se avisa arriba,
// para que nadie crea que el cambio de idioma falló. En los legales, además, la versión en español es la que vale.
export function AvisoSoloEspanol({ legal = false }) {
  const { t, idioma } = useIdioma();
  if (idioma === "es") return null;
  return (
    <p lang="en" className="mb-space-md p-3 rounded-xl bg-tertiary-fixed/50 text-on-surface font-body-sm text-body-sm flex items-start gap-2">
      <span className="material-symbols-outlined text-[18px] shrink-0" aria-hidden="true">translate</span>
      {legal ? t("Este documento solo está disponible en español, que es su versión oficial.") : t("Esta página solo está disponible en español.")}
    </p>
  );
}

// Estructura común de las páginas legales (Términos y Privacidad).
export default function PaginaLegal({ titulo, version, children }) {
  return (
    <article className="max-w-3xl mx-auto px-gutter py-space-xl">
      <AvisoSoloEspanol legal />
      <header className="mb-space-lg">
        <Insignia tono="etiqueta" className="mb-3">
          <span className="material-symbols-outlined text-[14px]">gavel</span>
          Documento legal
        </Insignia>
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
