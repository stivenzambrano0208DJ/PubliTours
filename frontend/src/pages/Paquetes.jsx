import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api, urlImagen } from "../api/client";
import { CATEGORIA_ICONOS } from "../constants";
import { Estrellas } from "../components/Estrellas";
import { portadaDelPaquete } from "../utils/catalogo";
import { pesos } from "../utils/moneda";
import { useIdioma } from "../context/idioma";
import Insignia from "../components/ui/Insignia";


export default function Paquetes() {
  const { t } = useIdioma();
  const [paquetes, setPaquetes] = useState([]);
  const [texto, setTexto] = useState("");
  const [cargando, setCargando] = useState(true);

  useEffect(() => {
    const t = setTimeout(() => {
      api.listarPaquetes({ texto }).then(setPaquetes).catch(() => setPaquetes([])).finally(() => setCargando(false));
    }, 250);
    return () => clearTimeout(t);
  }, [texto]);

  return (
    <div className="max-w-[1360px] mx-auto px-gutter py-space-xl flex flex-col gap-space-lg">
      <section className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div className="max-w-2xl">
          <Insignia tono="etiqueta" className="mb-3">
            <span className="material-symbols-outlined text-[14px]">inventory_2</span>
            {t("Paquetes turísticos")}
          </Insignia>
          <h1 className="font-headline-xl text-headline-xl text-primary tracking-tight">{t("Todo en una sola reserva")}</h1>
          <p className="font-body-md text-body-md text-on-surface-variant mt-2">
            {t("Combinaciones de experiencias de un mismo prestador, con precio especial por persona. Reservas una vez y el prestador organiza todo.")}
          </p>
        </div>
        <div className="relative w-full md:w-72">
          <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-outline text-[18px]">search</span>
          <input
            className="w-full pl-9 pr-3 py-2.5 bg-surface-container rounded-xl font-body-sm text-body-sm focus:outline-none focus:bg-surface-container-low"
            aria-label={t("Buscar paquetes...")}
            placeholder={t("Buscar paquetes...")}
            value={texto}
            onChange={(e) => setTexto(e.target.value)}
          />
        </div>
      </section>

      {cargando ? (
        <p className="font-body-md text-body-md text-on-surface-variant">{t("Cargando...")}</p>
      ) : paquetes.length === 0 ? (
        <div className="bg-surface-container-lowest rounded-3xl p-space-xl text-center">
          <span className="material-symbols-outlined text-outline text-[40px]">inventory_2</span>
          <p className="font-body-md text-body-md text-on-surface-variant mt-2">
            {texto ? t("No encontramos paquetes con esa búsqueda.") : t("Aún no hay paquetes publicados. Mientras tanto, explora los servicios por separado.")}
          </p>
          <Link to="/explorar" className="inline-block mt-4 px-5 py-2.5 rounded-xl bg-primary text-on-primary font-label-md text-label-md hover:bg-primary-container transition-colors">{t("Explorar destinos")}</Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-space-lg">
          {paquetes.map((p) => {
            const portada = portadaDelPaquete(p);
            return (
              <Link
                key={p.id}
                to={`/paquetes/${p.id}`}
                className="group flex flex-col rounded-2xl bg-surface-container-lowest overflow-hidden shadow-[0_4px_20px_-2px_rgba(6,78,59,0.04)] hover:shadow-[0_20px_30px_-6px_rgba(6,78,59,0.08)] transition-all duration-300 hover:-translate-y-1"
              >
                <div
                  className="relative h-44 bg-gradient-to-br from-primary-container to-secondary bg-cover bg-center flex items-end p-3"
                  style={portada ? { backgroundImage: `url(${urlImagen(portada)})` } : undefined}
                >
                  {portada && <div className="absolute inset-0 bg-gradient-to-t from-primary/70 via-primary/10 to-transparent" />}
                  <span className="relative px-3 py-1 rounded-full bg-surface-container-lowest/90 text-primary font-label-xs text-label-xs font-semibold">
                    {p.items.length} servicios · {Math.max(...p.items.map((i) => i.dia))} día(s)
                  </span>
                  {p.ahorro > 0 && (
                    <span className="absolute top-3 right-3 px-3 py-1 rounded-full bg-tertiary-container text-on-tertiary-container font-label-xs text-label-xs font-bold">
                      {t("Ahorras {valor}", { valor: pesos(p.ahorro) })}
                    </span>
                  )}
                </div>
                <div className="p-space-md flex flex-col gap-2 flex-1">
                  <h2 className="font-title-lg text-title-lg text-primary font-bold group-hover:text-secondary transition-colors">{p.nombre}</h2>
                  {p.total_resenas > 0 && (
                    <div className="flex items-center gap-1.5 -mt-1">
                      <Estrellas valor={p.calificacion_promedio} tamano={16} />
                      <span className="font-label-xs text-label-xs text-on-surface-variant">{p.calificacion_promedio} ({p.total_resenas})</span>
                    </div>
                  )}
                  <p className="font-label-xs text-label-xs text-on-surface-variant flex items-center gap-1">
                    <span className="material-symbols-outlined text-[14px]">storefront</span>
                    {p.Prestador?.nombre_negocio} · {p.Prestador?.municipio}
                  </p>
                  <div className="flex flex-wrap gap-1.5">
                    {p.items.map((i) => (
                      <span key={i.id} className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-surface text-on-surface-variant font-label-xs text-label-xs">
                        <span className="material-symbols-outlined text-[13px]">{CATEGORIA_ICONOS[i.sitio?.categoria] || "place"}</span>
                        {i.sitio?.nombre}
                      </span>
                    ))}
                  </div>
                  <div className="mt-auto pt-3 flex items-end justify-between">
                    <div className="flex flex-col">
                      <span className="font-label-xs text-label-xs text-on-surface-variant uppercase">{t("Por persona")}</span>
                      <div className="flex items-baseline gap-2">
                        <span className="font-title-lg text-title-lg font-bold text-primary">{Number(p.precio) === 0 ? t("Gratuito") : pesos(p.precio)}</span>
                        {p.ahorro > 0 && <span className="font-body-sm text-body-sm text-outline line-through">{pesos(p.precio_suelto)}</span>}
                      </div>
                    </div>
                    <span className="px-4 py-2 rounded-xl bg-surface-container text-primary font-label-md text-label-md group-hover:bg-primary-container group-hover:text-on-primary transition-colors">{t("Ver paquete")}</span>
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
