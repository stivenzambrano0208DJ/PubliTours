import { useState } from "react";
import { Link, useParams } from "react-router-dom";
import { api } from "../api/client";
import { useAuth } from "../context/auth";
import { useConsulta } from "../hooks/useConsulta";
import { useEsServicioPropio } from "../hooks/useEsServicioPropio";
import { fotosDelSitio } from "../utils/imagenes";
import MapaVisor from "../components/mapa/MapaVisor";
import ResenasSitio from "../components/sitio/ResenasSitio";
import HeroSitio from "../components/sitio/HeroSitio";
import VisorFotos from "../components/sitio/VisorFotos";
import FichaTecnica from "../components/sitio/FichaTecnica";
import TarjetaPrestador from "../components/sitio/TarjetaPrestador";
import PanelReserva from "../components/sitio/PanelReserva";
import { useAvisos } from "../context/avisos";

const MENSAJE_CARGANDO = "max-w-[1360px] mx-auto px-gutter py-space-xl font-body-md text-body-md text-on-surface-variant";

function Titulo({ icono, children }) {
  return (
    <div className="flex items-center gap-2">
      <span className="p-2 rounded-xl bg-secondary-container/40 text-on-secondary-container">
        <span className="material-symbols-outlined text-[22px]">{icono}</span>
      </span>
      <h2 className="font-headline-md text-headline-md text-primary font-bold">{children}</h2>
    </div>
  );
}

// Detalle público de un servicio: portada, información real, ubicación, reseñas, prestador y reserva.
export default function SitioDetalle() {
  const { avisar } = useAvisos();
  const { id } = useParams();
  const { usuario } = useAuth();
  const { datos: sitio, error, cargando } = useConsulta(id, () => api.obtenerSitio(id));
  const esPropio = useEsServicioPropio(sitio);
  const [visorIndice, setVisorIndice] = useState(null);

  if (cargando) return <p className={MENSAJE_CARGANDO}>Cargando...</p>;
  if (error || !sitio) {
    return (
      <div className="max-w-[1360px] mx-auto px-gutter py-space-xl">
        <p className="text-error font-body-md text-body-md">{error || "Sitio no encontrado."}</p>
        <Link to="/explorar" className="text-secondary font-label-md text-label-md hover:underline">Volver a Explorar Destinos</Link>
      </div>
    );
  }

  const fotos = fotosDelSitio(sitio);

  const compartir = async () => {
    const url = window.location.href;
    if (navigator.share) {
      try { await navigator.share({ title: sitio.nombre, url }); } catch { /* el usuario canceló */ }
    } else {
      await navigator.clipboard.writeText(url);
      avisar("Enlace copiado al portapapeles.", "ok");
    }
  };

  return (
    <div className="flex flex-col w-full">
      <section className="max-w-[1360px] w-full mx-auto px-gutter pt-space-lg pb-space-sm">
        <nav className="flex items-center flex-wrap gap-2 font-label-md text-label-md text-on-surface-variant">
          <Link to="/" className="hover:text-primary transition-colors flex items-center gap-1">
            <span className="material-symbols-outlined text-[18px]">home</span> Inicio
          </Link>
          <span className="material-symbols-outlined text-[14px] text-outline">chevron_right</span>
          <Link to="/explorar" className="hover:text-primary transition-colors">Explorar Destinos</Link>
          <span className="material-symbols-outlined text-[14px] text-outline">chevron_right</span>
          <span className="text-primary font-medium">{sitio.nombre}</span>
        </nav>
      </section>

      <HeroSitio sitio={sitio} fotos={fotos} onAbrirVisor={setVisorIndice} onCompartir={compartir} />
      {visorIndice !== null && (
        <VisorFotos fotos={fotos} indice={visorIndice} nombre={sitio.nombre} onCambiar={setVisorIndice} onCerrar={() => setVisorIndice(null)} />
      )}

      <main className="max-w-[1360px] w-full mx-auto px-gutter">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-start">
          <div className="lg:col-span-8 flex flex-col gap-space-lg pb-20">
            <FichaTecnica sitio={sitio} />

            <article className="flex flex-col gap-3">
              <Titulo icono="history_edu">Acerca de este sitio</Titulo>
              <p className="font-body-lg text-body-lg text-on-surface leading-relaxed">
                {sitio.descripcion || "Este prestador aún no agregó una descripción detallada para este sitio."}
              </p>
            </article>

            {sitio.latitud && sitio.longitud && (
              <section className="flex flex-col gap-3">
                <Titulo icono="pin_drop">Ubicación</Titulo>
                <MapaVisor lat={sitio.latitud} lng={sitio.longitud} nombre={sitio.nombre} />
              </section>
            )}

            <ResenasSitio sitioId={sitio.id} />
            {sitio.Prestador && <TarjetaPrestador prestador={sitio.Prestador} />}
          </div>

          <PanelReserva sitio={sitio} esAdmin={usuario?.rol === "administrador"} esPropio={esPropio} />
        </div>
      </main>
    </div>
  );
}
