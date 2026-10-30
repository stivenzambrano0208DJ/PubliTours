import { Link, useParams } from "react-router-dom";
import { api, urlImagen } from "../api/client";
import { CATEGORIA_ICONOS } from "../constants";
import { Estrellas } from "../components/Estrellas";
import { portadaDelPaquete } from "../utils/catalogo";
import { enlaceExterno, enlaceWhatsApp } from "../utils/enlaces";
import { useConsulta } from "../hooks/useConsulta";
import { useIdioma } from "../context/idioma";
import Tarjeta from "../components/ui/Tarjeta";

// Página pública de un negocio: quién es, cómo contactarlo y todo lo que ofrece.
export default function Negocio() {
  const { t, td, locale } = useIdioma();
  const pesos = (n) => (Number(n) === 0 ? t("Gratuito") : `$${Number(n).toLocaleString(locale)}`);
  const { id } = useParams();
  const { datos: negocio, error, cargando } = useConsulta(id, () => api.negocioPublico(id));

  if (cargando) return <p className="max-w-[1360px] mx-auto px-gutter py-space-xl font-body-md text-body-md text-on-surface-variant">{t("Cargando...")}</p>;
  if (error || !negocio) {
    return (
      <div className="max-w-md mx-auto px-gutter py-space-xl text-center">
        <span className="material-symbols-outlined text-outline text-[40px]">storefront</span>
        <p className="font-body-md text-body-md text-on-surface-variant mt-2">{error || t("Negocio no encontrado.")}</p>
        <Link to="/explorar" className="inline-block mt-4 px-5 py-2.5 rounded-xl bg-primary text-on-primary font-label-md text-label-md">{t("Explorar destinos")}</Link>
      </div>
    );
  }

  const whatsapp = enlaceWhatsApp(negocio.telefono);
  const redes = enlaceExterno(negocio.redes);
  const { total, promedio, recientes } = negocio.resenas;

  return (
    <div className="max-w-[1360px] mx-auto px-gutter py-space-xl flex flex-col gap-space-xl">
      <header className="rounded-3xl bg-surface-container-lowest p-6 md:p-8 shadow-[0_4px_28px_-4px_rgba(6,78,59,0.08)] flex flex-col md:flex-row gap-6 md:items-center justify-between">
        <div className="flex items-start gap-5 min-w-0">
          <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-primary-container to-secondary flex items-center justify-center shrink-0 shadow-md">
            <span className="material-symbols-outlined text-on-primary text-[38px]">storefront</span>
          </div>
          <div className="flex flex-col gap-1.5 min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <span className="px-3 py-1 rounded-full bg-secondary-container/50 text-secondary font-label-xs text-label-xs font-semibold">{td(negocio.categoria)}</span>
              <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-primary-fixed text-on-primary-fixed-variant font-label-xs text-label-xs font-semibold">
                <span className="material-symbols-outlined text-[14px]">verified</span> {t("Negocio verificado")}
              </span>
            </div>
            <h1 className="font-headline-xl text-headline-xl text-primary tracking-tight break-words">{negocio.nombre_negocio}</h1>
            <p className="font-body-sm text-body-sm text-on-surface-variant flex flex-wrap items-center gap-x-4 gap-y-1">
              <span className="inline-flex items-center gap-1"><span className="material-symbols-outlined text-[16px]">location_on</span>{negocio.municipio}, Caquetá</span>
              {total > 0 && <span className="inline-flex items-center gap-1.5"><Estrellas valor={promedio} tamano={16} />{promedio} ({total} reseña{total === 1 ? "" : "s"})</span>}
              <span>{t("En PubliTours desde {fecha}", { fecha: new Date(negocio.miembro_desde).toLocaleDateString(locale, { month: "long", year: "numeric" }) })}</span>
            </p>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row md:flex-col gap-2 shrink-0">
          {whatsapp && (
            <a href={whatsapp} target="_blank" rel="noopener noreferrer" className="inline-flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-secondary text-on-secondary font-label-md text-label-md font-semibold hover:bg-secondary-container hover:text-on-secondary-container transition-colors">
              <span className="material-symbols-outlined text-[20px]">chat</span> {t("Escribir por WhatsApp")}
            </a>
          )}
          {redes && (
            <a href={redes} target="_blank" rel="noopener noreferrer nofollow" className="inline-flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-surface-container text-primary font-label-md text-label-md font-semibold hover:bg-surface-container-high transition-colors">
              <span className="material-symbols-outlined text-[20px]">language</span> {t("Redes y sitio web")}
            </a>
          )}
        </div>
      </header>

      {(negocio.descripcion || negocio.direccion || (negocio.redes && !redes)) && (
        <section className="grid grid-cols-1 lg:grid-cols-3 gap-space-lg">
          {negocio.descripcion && (
            <Tarjeta className="lg:col-span-2 p-6">
              <h2 className="font-title-lg text-title-lg text-primary font-bold mb-2">{t("Sobre el negocio")}</h2>
              <p className="font-body-md text-body-md text-on-surface-variant whitespace-pre-line">{negocio.descripcion}</p>
            </Tarjeta>
          )}
          <div className="rounded-2xl bg-surface-container-low p-6 flex flex-col gap-3">
            {negocio.direccion && (
              <div>
                <p className="font-label-xs text-label-xs uppercase tracking-wider text-outline font-semibold mb-1">{t("Dirección o cómo llegar")}</p>
                <p className="font-body-sm text-body-sm text-on-surface flex items-start gap-1.5"><span className="material-symbols-outlined text-[18px] text-secondary shrink-0">pin_drop</span>{negocio.direccion}</p>
              </div>
            )}
            {negocio.redes && !redes && (
              <div>
                <p className="font-label-xs text-label-xs uppercase tracking-wider text-outline font-semibold mb-1">{t("Redes")}</p>
                <p className="font-body-sm text-body-sm text-on-surface">{negocio.redes}</p>
              </div>
            )}
          </div>
        </section>
      )}

      <section className="flex flex-col gap-4">
        <h2 className="font-headline-md text-headline-md text-primary font-bold">{t("Servicios ({n})", { n: negocio.servicios.length })}</h2>
        {negocio.servicios.length === 0 ? (
          <p className="font-body-sm text-body-sm text-on-surface-variant">{t("Este negocio aún no tiene servicios publicados.")}</p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-space-md">
            {negocio.servicios.map((s) => (
              <Link key={s.id} to={`/sitios/${s.id}`} className="group flex flex-col rounded-2xl bg-surface-container-lowest overflow-hidden shadow-sm hover:shadow-lg transition-all hover:-translate-y-0.5">
                <div className="relative h-36 bg-gradient-to-br from-primary-container to-secondary bg-cover bg-center flex items-center justify-center" style={s.imagen_url ? { backgroundImage: `url(${urlImagen(s.imagen_url)})` } : undefined}>
                  {!s.imagen_url && <span className="material-symbols-outlined text-on-primary text-[36px] opacity-80">{CATEGORIA_ICONOS[s.categoria] || "place"}</span>}
                </div>
                <div className="p-4 flex flex-col gap-1">
                  <h3 className="font-title-sm text-title-sm text-primary font-bold group-hover:text-secondary transition-colors">{s.nombre}</h3>
                  <span className="font-label-xs text-label-xs text-outline">{s.municipio} · {td(s.categoria)}</span>
                  <div className="flex items-center justify-between mt-1">
                    <span className="font-title-sm text-title-sm text-primary font-semibold">{pesos(s.precio)}</span>
                    {s.total_resenas > 0 && <span className="inline-flex items-center gap-1 font-label-xs text-label-xs text-on-surface-variant"><Estrellas valor={1} tamano={15} />{s.calificacion_promedio} ({s.total_resenas})</span>}
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </section>

      {negocio.paquetes.length > 0 && (
        <section className="flex flex-col gap-4">
          <h2 className="font-headline-md text-headline-md text-primary font-bold">{t("Paquetes ({n})", { n: negocio.paquetes.length })}</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-space-md">
            {negocio.paquetes.map((p) => {
              const portada = portadaDelPaquete(p);
              return (
                <Link key={p.id} to={`/paquetes/${p.id}`} className="group flex flex-col rounded-2xl bg-surface-container-lowest overflow-hidden shadow-sm hover:shadow-lg transition-all hover:-translate-y-0.5">
                  <div className="relative h-36 bg-gradient-to-br from-primary-container to-secondary bg-cover bg-center" style={portada ? { backgroundImage: `url(${urlImagen(portada)})` } : undefined}>
                    {p.ahorro > 0 && <span className="absolute top-3 right-3 px-3 py-1 rounded-full bg-tertiary-container text-on-tertiary-container font-label-xs text-label-xs font-bold">{t("Ahorras {valor}", { valor: pesos(p.ahorro) })}</span>}
                  </div>
                  <div className="p-4 flex flex-col gap-1">
                    <h3 className="font-title-sm text-title-sm text-primary font-bold group-hover:text-secondary transition-colors">{p.nombre}</h3>
                    <span className="font-label-xs text-label-xs text-outline">{p.items.map((i) => i.sitio?.nombre).join(" + ")}</span>
                    <span className="font-title-sm text-title-sm text-primary font-semibold mt-1">{pesos(p.precio)} <span className="font-label-xs text-label-xs text-on-surface-variant font-normal">{t("por persona")}</span></span>
                  </div>
                </Link>
              );
            })}
          </div>
        </section>
      )}

      <section className="flex flex-col gap-4">
        <h2 className="font-headline-md text-headline-md text-primary font-bold">{t("Lo que dicen los viajeros")}</h2>
        {total === 0 ? (
          <p className="font-body-sm text-body-sm text-on-surface-variant p-4 rounded-2xl bg-surface-container-low">{t("Aún no hay reseñas. Solo califican quienes ya vivieron la experiencia.")}</p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-space-md">
            {recientes.map((r) => (
              <article key={r.id} className="p-5 rounded-2xl bg-surface-container-low flex flex-col gap-1.5">
                <div className="flex items-center justify-between gap-2">
                  <span className="font-title-sm text-title-sm text-on-surface font-semibold">{r.turista?.nombre || "Viajero"}</span>
                  <span className="font-label-xs text-label-xs text-outline">{new Date(r.fecha).toLocaleDateString(locale)}</span>
                </div>
                <Estrellas valor={r.calificacion} tamano={16} />
                <span className="font-label-xs text-label-xs text-secondary font-semibold">{r.Paquete ? `Paquete: ${r.Paquete.nombre}` : r.SitioTuristico?.nombre}</span>
                {r.comentario && <p className="font-body-sm text-body-sm text-on-surface-variant">{r.comentario}</p>}
                {r.respuesta && (
                  <div className="mt-1 ml-3 pl-3 border-l-2 border-secondary">
                    <p className="font-label-xs text-label-xs text-secondary font-semibold">{t("Respuesta del negocio")}</p>
                    <p className="font-body-sm text-body-sm text-on-surface">{r.respuesta}</p>
                  </div>
                )}
              </article>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
