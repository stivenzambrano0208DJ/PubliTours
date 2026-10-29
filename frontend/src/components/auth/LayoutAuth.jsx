import { Link } from "react-router-dom";
import { useIdioma } from "../../context/idioma";

const ETIQUETA = "inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-black/30 backdrop-blur-md border border-white/15 font-label-xs text-label-xs text-on-primary/90";

// Estructura de las pantallas de acceso con imagen (iniciar sesión y registrarse): a la izquierda la imagen con un mensaje
// (solo en pantallas grandes) y a la derecha el formulario, que es el contenido (`children`).
// hero = { imagen, titulo: [primeraLinea, lineaResaltada], descripcion, etiquetas: [{ icono, texto }] }
export default function LayoutAuth({ hero, children }) {
  const { t } = useIdioma();
  return (
    <div className="relative h-dvh w-full flex flex-col lg:flex-row overflow-hidden">
      <section className="relative hidden lg:flex lg:w-1/2 flex-col justify-between p-10 xl:p-14 overflow-hidden">
        <div className="absolute inset-0 z-0">
          <img alt={t("Paisaje aéreo de la Amazonía del Caquetá")} className="w-full h-full object-cover object-center" src={hero.imagen} />
          <div className="absolute inset-0 bg-gradient-to-t from-primary/95 via-primary/50 to-primary/30" />
        </div>

        <Link to="/" className="relative z-10 inline-flex items-center gap-1.5 text-on-primary/90 hover:text-on-primary transition-colors font-label-md text-label-md w-fit">
          <span className="material-symbols-outlined text-[18px]">arrow_back</span>
          <span>{t("Volver al inicio")}</span>
        </Link>

        <div className="relative z-10 max-w-xl">
          <div className="w-12 h-1 bg-secondary-fixed rounded-full mb-4" />
          <h2 className="font-headline-xl text-headline-xl text-on-primary tracking-tight leading-[1.08] mb-3">
            {hero.titulo[0]}<br />
            <span className="text-secondary-fixed">{hero.titulo[1]}</span>
          </h2>
          <p className="font-body-md text-body-md text-primary-fixed-dim/90 leading-relaxed mb-6 max-w-md">{hero.descripcion}</p>
          <div className="flex flex-wrap items-center gap-2">
            {hero.etiquetas.map(({ icono, texto }) => (
              <div key={texto} className={ETIQUETA}>
                <span className="material-symbols-outlined text-[15px] text-secondary-fixed">{icono}</span>
                <span>{texto}</span>
              </div>
            ))}
          </div>
        </div>

        <p className="relative z-10 font-label-xs text-label-xs text-on-primary/60 tracking-wider uppercase">
          {t("Caquetá, Puerta de Oro de la Amazonía Colombiana")}
        </p>
      </section>

      <section className="relative flex-1 flex p-6 sm:p-10 bg-surface-container-lowest overflow-y-auto">
        <div className="w-full max-w-md mx-auto my-auto">
          <Link to="/" className="lg:hidden inline-flex items-center gap-1.5 mb-4 text-on-surface-variant hover:text-primary transition-colors font-label-md text-label-md">
            <span className="material-symbols-outlined text-[18px]">arrow_back</span>
            <span>{t("Volver al inicio")}</span>
          </Link>
          {children}
        </div>
      </section>
    </div>
  );
}
