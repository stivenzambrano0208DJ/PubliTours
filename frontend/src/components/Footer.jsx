import { Link } from "react-router-dom";

export default function Footer() {
  return (
    <footer className="print:hidden w-full bg-surface-container-low text-on-surface-variant mt-space-xl">
      <div className="max-w-[1360px] mx-auto px-gutter py-space-xl">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-space-lg mb-space-xl">
          <div className="lg:col-span-2 flex flex-col gap-space-sm">
            <div className="flex items-center gap-space-sm">
              <span className="font-title-lg text-title-lg text-primary">PubliTours Caquetá</span>
              <span className="px-2 py-0.5 rounded-full bg-secondary-container/40 text-secondary font-label-xs text-label-xs font-semibold">
                IA Sanctuary
              </span>
            </div>
            <p className="font-body-md text-body-md text-on-surface-variant max-w-sm">
              Plataforma de inteligencia turística para el departamento del Caquetá. Conectamos turistas con
              información verificada de prestadores locales, y a los prestadores con visibilidad digital real.
            </p>
          </div>
          <div className="flex flex-col gap-space-sm">
            <span className="font-title-sm text-title-sm text-on-surface">Proyecto</span>
            <ul className="flex flex-col gap-2 font-body-sm text-body-sm">
              <li>Tecnología en Análisis y Desarrollo de Software</li>
              <li>SENA — Regional Caquetá</li>
              <li>Florencia, Caquetá, Colombia</li>
            </ul>
          </div>
          <div className="flex flex-col gap-space-sm">
            <span className="font-title-sm text-title-sm text-on-surface">Turismo Responsable</span>
            <ul className="flex flex-col gap-2 font-body-sm text-body-sm">
              <li>Información 100% verificada</li>
              <li>Prestadores locales certificados</li>
              <li><Link to="/ayuda" className="hover:text-primary hover:underline transition-colors">Preguntas frecuentes</Link></li>
              <li><Link to="/privacidad" className="hover:text-primary hover:underline transition-colors">Política de privacidad (Ley 1581 de 2012)</Link></li>
              <li><Link to="/terminos" className="hover:text-primary hover:underline transition-colors">Términos y condiciones</Link></li>
            </ul>
          </div>
        </div>
        <div className="pt-space-md flex flex-col md:flex-row items-center justify-between gap-space-sm font-body-sm text-body-sm">
          <p>© 2026 PubliTours (Caquetá Vive IA). Proyecto de grado ADSO-SENA.</p>
        </div>
      </div>
    </footer>
  );
}
