import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { api, urlImagen } from "../api/client";
import Carrusel from "../components/Carrusel";
import heroCaqueta from "../assets/hero-caqueta.webp";
import { useIdioma } from "../context/idioma";

export default function Home() {
  const { t, locale } = useIdioma();
  const [texto, setTexto] = useState("");
  const [destacados, setDestacados] = useState([]);
  const [totalSitios, setTotalSitios] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    api.buscarSitios({ limit: 12, orden: "relevancia" })
      .then((data) => {
        setDestacados(data.resultados);
        setTotalSitios(data.total);
      })
      .catch(() => {});
  }, []);

  const handleBuscar = (e) => {
    e.preventDefault();
    navigate(`/explorar${texto ? `?texto=${encodeURIComponent(texto)}` : ""}`);
  };

  return (
    <div className="flex flex-col w-full">
      {/* HERO */}
      <section className="relative w-full -mt-20 overflow-hidden bg-primary-container text-on-primary">
        <div
          className="absolute inset-0 w-full h-full bg-cover bg-center mix-blend-overlay opacity-40 scale-105"
          style={{ backgroundImage: `url(${heroCaqueta})` }}
        />
        <div className="absolute -top-40 -left-40 w-96 h-96 rounded-full bg-secondary/30 blur-3xl pointer-events-none" />
        <div className="absolute top-1/2 -right-32 w-[32rem] h-[32rem] rounded-full bg-tertiary-container/30 blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 inset-x-0 h-40 bg-gradient-to-t from-surface via-surface/30 to-transparent pointer-events-none" />

        <div className="relative max-w-[1360px] mx-auto px-gutter pt-36 pb-24 lg:pt-44 lg:pb-32 flex flex-col items-center text-center">
          <div className="inline-flex items-center gap-2.5 px-4 py-2 rounded-full bg-surface-container-lowest/15 backdrop-blur-md shadow-lg shadow-primary-container/20 mb-6">
            <span className="flex h-2 w-2 rounded-full bg-secondary-fixed animate-ping" />
            <span className="material-symbols-outlined text-[18px] text-tertiary-fixed">auto_awesome</span>
            <span className="font-label-md text-label-md text-primary-fixed tracking-wide">
              {t("Plataforma de Inteligencia Turística del Caquetá")}
            </span>
          </div>

          <h1 className="font-display-lg text-display-lg max-w-4xl text-on-primary tracking-tight leading-none mb-6">
            {t("Descubre el")}{" "}
            <span className="bg-gradient-to-r from-secondary-fixed via-secondary-container to-primary-fixed bg-clip-text text-transparent">
              Caquetá
            </span>{" "}
            {t("de una nueva manera")}
          </h1>

          <p className="font-body-lg text-body-lg text-primary-fixed-dim/90 max-w-2xl mx-auto mb-10 leading-relaxed">
            {t("La puerta de la Amazonía colombiana, organizada, verificada y a tu medida. Encuentra sitios, negocios locales y construye tu itinerario con ayuda de inteligencia artificial.")}
          </p>

          <div className="flex flex-wrap items-center justify-center gap-4 mb-16">
            <button
              onClick={() => navigate("/explorar")}
              className="inline-flex items-center gap-3 px-8 py-4 rounded-xl bg-secondary text-on-secondary font-title-sm text-title-sm hover:bg-secondary-container hover:text-on-secondary-container shadow-xl shadow-secondary/20 transition-all hover:-translate-y-0.5"
            >
              <span>{t("Explorar destinos")}</span>
              <span className="material-symbols-outlined text-[20px]">arrow_forward</span>
            </button>
            <button
              onClick={() => navigate("/itinerario")}
              className="inline-flex items-center gap-2.5 px-8 py-4 rounded-xl bg-surface-container-lowest/10 hover:bg-surface-container-lowest/20 backdrop-blur-md text-tertiary-fixed font-title-sm text-title-sm shadow-lg shadow-black/10 transition-all hover:-translate-y-0.5"
            >
              <span className="material-symbols-outlined text-tertiary-fixed-dim text-[20px]">psychology</span>
              <span>{t("Crear mi itinerario con IA")}</span>
            </button>
          </div>

          {/* Buscador flotante */}
          <div className="w-full max-w-2xl rounded-2xl bg-surface-container-lowest/90 backdrop-blur-xl p-4 lg:p-5 shadow-2xl shadow-primary-container/25 text-left text-on-surface">
            <form className="flex flex-col sm:flex-row gap-3" onSubmit={handleBuscar}>
              <div className="flex-1 p-3 rounded-xl bg-surface-container-low hover:bg-surface-container transition-colors flex flex-col justify-center">
                <span className="font-label-xs text-label-xs text-on-surface-variant flex items-center gap-1.5 uppercase">
                  <span className="material-symbols-outlined text-[16px] text-secondary">explore</span>
                  {t("¿Qué lugar quieres descubrir?")}
                </span>
                <input
                  className="w-full bg-transparent font-title-sm text-title-sm text-on-surface placeholder:text-outline focus:outline-none pt-1"
                  aria-label={t("¿Qué lugar quieres descubrir?")}
                  placeholder={t("Ej: cascadas, fincas, gastronomía...")}
                  type="text"
                  value={texto}
                  onChange={(e) => setTexto(e.target.value)}
                />
              </div>
              <button
                className="flex items-center justify-center gap-2 py-4 px-6 rounded-xl bg-primary text-on-primary font-title-sm text-title-sm hover:bg-primary-container shadow-md shadow-primary/30 transition-transform active:scale-95"
                type="submit"
              >
                <span className="material-symbols-outlined text-[20px]">search</span>
                <span>{t("Buscar")}</span>
              </button>
            </form>
          </div>
        </div>
      </section>

      {/* MÉTRICAS DE CONFIANZA */}
      <section className="w-full bg-surface py-12 -mt-6 relative z-10">
        <div className="max-w-[1360px] mx-auto px-gutter">
          <div className="grid grid-cols-2 md:grid-cols-3 gap-6 p-8 rounded-2xl bg-surface-container-lowest shadow-xl shadow-primary-container/5">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-secondary-container/40 text-secondary flex items-center justify-center shrink-0">
                <span className="material-symbols-outlined text-[28px]">verified_user</span>
              </div>
              <div>
                <p className="font-headline-md text-headline-md text-on-surface">100%</p>
                <p className="font-body-sm text-body-sm text-on-surface-variant">{t("Prestadores verificados por un administrador")}</p>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-surface-container text-primary flex items-center justify-center shrink-0">
                <span className="material-symbols-outlined text-[28px]">forest</span>
              </div>
              <div>
                <p className="font-headline-md text-headline-md text-on-surface">{totalSitios ?? "—"}</p>
                <p className="font-body-sm text-body-sm text-on-surface-variant">{t("Sitios activos en el catálogo")}</p>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-secondary-container/30 text-on-secondary-container flex items-center justify-center shrink-0">
                <span className="material-symbols-outlined text-[28px]">smart_toy</span>
              </div>
              <div>
                <p className="font-headline-md text-headline-md text-on-surface">{t("IA")}</p>
                <p className="font-body-sm text-body-sm text-on-surface-variant">{t("Itinerarios generados solo con datos reales")}</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* DESTINOS DESTACADOS (datos reales del catálogo) */}
      <section className="w-full py-16 bg-surface" id="destinos">
        <div className="max-w-[1360px] mx-auto px-gutter">
          <div className="flex flex-col md:flex-row md:items-end justify-between mb-12 gap-4">
            <div>
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-secondary-container/30 text-secondary font-label-xs text-label-xs mb-3">
                <span className="material-symbols-outlined text-[16px]">location_on</span>
                <span>{t("Catálogo verificado")}</span>
              </div>
              <h2 className="font-headline-xl text-headline-xl text-on-surface tracking-tight">
                {t("Destinos destacados en Caquetá")}
              </h2>
              <p className="font-body-md text-body-md text-on-surface-variant mt-2 max-w-xl">
                {t("Sitios y servicios reales cargados por prestadores verificados del departamento.")}
              </p>
            </div>
            <button
              onClick={() => navigate("/explorar")}
              className="inline-flex items-center gap-2 text-secondary font-title-sm text-title-sm hover:text-primary transition-colors"
            >
              <span>{t("Ver catálogo completo")}</span>
              <span className="material-symbols-outlined text-[20px]">north_east</span>
            </button>
          </div>

          {destacados.length === 0 && (
            <p className="font-body-md text-body-md text-on-surface-variant">
              {t("Aún no hay sitios publicados en el catálogo.")}
            </p>
          )}

          <Carrusel etiqueta={t("Destinos destacados")}>
            {destacados.map((sitio) => (
              <div
                key={sitio.id}
                className="group relative flex flex-col h-full rounded-2xl bg-surface-container-lowest shadow-md hover:shadow-2xl transition-all duration-300 hover:-translate-y-1 overflow-hidden cursor-pointer"
                onClick={() => navigate(`/sitios/${sitio.id}`)}
              >
                <div
                  className="relative h-48 w-full overflow-hidden bg-gradient-to-br from-primary-container to-secondary flex items-end p-4"
                  style={sitio.imagen_url ? { backgroundImage: `url(${urlImagen(sitio.imagen_url)})`, backgroundSize: "cover", backgroundPosition: "center" } : undefined}
                >
                  {sitio.imagen_url && <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/10 to-transparent" />}
                  <div className="absolute top-3 left-3 px-3 py-1 rounded-full bg-surface-container-lowest/80 backdrop-blur-md text-on-surface font-label-xs text-label-xs">
                    {sitio.categoria}
                  </div>
                  <div className="relative text-on-primary">
                    <span className="font-label-xs text-label-xs uppercase tracking-wider text-secondary-fixed">
                      {sitio.municipio}
                    </span>
                    <h3 className="font-title-lg text-title-lg">{sitio.nombre}</h3>
                  </div>
                </div>
                <div className="p-5 flex flex-col justify-between flex-1">
                  <p className="font-body-sm text-body-sm text-on-surface-variant line-clamp-2 mb-4">
                    {sitio.descripcion || t("Sin descripción disponible.")}
                  </p>
                  <div className="flex items-center justify-between pt-4 mt-auto bg-surface-container-low/50 -mx-5 -mb-5 px-5 py-3">
                    <div>
                      <span className="font-label-xs text-label-xs text-on-surface-variant">{t("Desde")}</span>
                      <p className="font-title-sm text-title-sm text-primary font-bold">
                        {Number(sitio.precio) === 0 ? t("Gratuito") : `$${Number(sitio.precio).toLocaleString(locale)}`}
                      </p>
                    </div>
                    <span className="w-10 h-10 rounded-xl bg-surface-container group-hover:bg-secondary group-hover:text-on-secondary text-primary flex items-center justify-center transition-colors">
                      <span className="material-symbols-outlined text-[20px]">arrow_forward</span>
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </Carrusel>
        </div>
      </section>

      {/* CÓMO FUNCIONA */}
      <section className="w-full py-20 bg-surface-container-low" id="como-funciona">
        <div className="max-w-[1360px] mx-auto px-gutter">
          <div className="text-center max-w-2xl mx-auto mb-16">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-secondary-container/30 text-secondary font-label-xs text-label-xs mb-3">
              <span className="material-symbols-outlined text-[16px]">touch_app</span>
              <span>{t("Simple, verificado, personalizado")}</span>
            </div>
            <h2 className="font-headline-xl text-headline-xl text-on-surface tracking-tight">
              {t("¿Cómo funciona PubliTours?")}
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="flex flex-col p-8 rounded-2xl bg-surface-container-lowest shadow-md hover:shadow-xl transition-all duration-300 group">
              <div className="w-14 h-14 rounded-2xl bg-secondary-container/40 text-secondary flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                <span className="material-symbols-outlined text-[32px]">checklist</span>
              </div>
              <span className="font-label-xs text-label-xs uppercase tracking-widest text-secondary font-bold mb-2">{t("Paso 01")}</span>
              <h3 className="font-title-lg text-title-lg text-on-surface mb-3">{t("Indica tus preferencias")}</h3>
              <p className="font-body-md text-body-md text-on-surface-variant leading-relaxed">
                {t("Dinos tu presupuesto, los días que tienes disponibles y qué tipo de experiencia buscas.")}
              </p>
            </div>
            <div className="flex flex-col p-8 rounded-2xl bg-surface-container-lowest shadow-md hover:shadow-xl transition-all duration-300 group">
              <div className="w-14 h-14 rounded-2xl bg-primary-container text-on-primary flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                <span className="material-symbols-outlined text-[32px] text-tertiary-fixed">smart_toy</span>
              </div>
              <span className="font-label-xs text-label-xs uppercase tracking-widest text-primary font-bold mb-2">{t("Paso 02")}</span>
              <h3 className="font-title-lg text-title-lg text-on-surface mb-3">{t("El sistema arma tu itinerario")}</h3>
              <p className="font-body-md text-body-md text-on-surface-variant leading-relaxed">
                {t("Un motor de puntuación ordena las mejores opciones del catálogo verificado, día por día, con una justificación de por qué se incluyó cada una.")}
              </p>
            </div>
            <div className="flex flex-col p-8 rounded-2xl bg-surface-container-lowest shadow-md hover:shadow-xl transition-all duration-300 group">
              <div className="w-14 h-14 rounded-2xl bg-tertiary-fixed text-on-tertiary-fixed flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                <span className="material-symbols-outlined text-[32px]">confirmation_number</span>
              </div>
              <span className="font-label-xs text-label-xs uppercase tracking-widest text-tertiary font-bold mb-2">{t("Paso 03")}</span>
              <h3 className="font-title-lg text-title-lg text-on-surface mb-3">{t("Reserva directamente")}</h3>
              <p className="font-body-md text-body-md text-on-surface-variant leading-relaxed">
                {t("Solicita tu reserva con un clic; el prestador la confirma y tú haces seguimiento del estado en tiempo real.")}
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA FINAL */}
      <section className="w-full py-16 bg-surface">
        <div className="max-w-[1360px] mx-auto px-gutter">
          <div className="relative overflow-hidden rounded-3xl bg-primary-container text-on-primary p-8 md:p-16 flex flex-col items-center text-center shadow-2xl">
            <div className="absolute -bottom-20 -right-20 w-80 h-80 rounded-full bg-secondary-fixed/20 blur-3xl pointer-events-none" />
            <div className="relative z-10 max-w-2xl flex flex-col items-center">
              <h2 className="font-headline-xl text-headline-xl text-on-primary mb-4">
                {t("¿Listo para descubrir el Caquetá?")}
              </h2>
              <p className="font-body-lg text-body-lg text-primary-fixed-dim mb-8">
                {t("Crea tu cuenta y genera tu primer itinerario personalizado en minutos.")}
              </p>
              <div className="flex flex-wrap items-center justify-center gap-4">
                <button
                  onClick={() => navigate("/registro")}
                  className="inline-flex items-center gap-3 px-8 py-4 rounded-xl bg-gradient-to-r from-secondary to-secondary-container text-primary font-title-sm text-title-sm hover:opacity-95 shadow-xl transition-all transform hover:-translate-y-0.5"
                >
                  <span className="material-symbols-outlined text-[20px] text-tertiary">auto_awesome</span>
                  <span className="font-bold">{t("Crear cuenta gratis")}</span>
                </button>
                <button
                  onClick={() => navigate("/explorar")}
                  className="inline-flex items-center gap-2 px-6 py-4 rounded-xl bg-surface-container-lowest/15 hover:bg-surface-container-lowest/25 backdrop-blur-md text-on-primary font-title-sm text-title-sm transition-all"
                >
                  <span>{t("Ver catálogo completo")}</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
