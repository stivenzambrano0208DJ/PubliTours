import { useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useAuth } from "../context/auth";
import { useBusquedaSitios } from "../hooks/useBusquedaSitios";
import MapaSitios from "../components/MapaSitios";
import CabeceraBusqueda from "../components/buscar/CabeceraBusqueda";
import BarraFiltros from "../components/buscar/BarraFiltros";
import TarjetaSitio from "../components/buscar/TarjetaSitio";
import Paginacion from "../components/buscar/Paginacion";
import BannerItinerario from "../components/buscar/BannerItinerario";
import ModalReservaRapida from "../components/buscar/ModalReservaRapida";
import ModalInfoSitio from "../components/buscar/ModalInfoSitio";

const VISTAS = [{ id: "lista", icono: "grid_view", label: "Lista" }, { id: "mapa", icono: "map", label: "Mapa" }];

// Explorar destinos: buscador, filtros, resultados (lista o mapa) y reserva rápida. La lógica de búsqueda vive en useBusquedaSitios.
export default function Buscar() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { usuario } = useAuth();
  const esAdmin = usuario?.rol === "administrador";

  const busqueda = useBusquedaSitios(searchParams.get("texto") || "");
  const { filtros, resultado, cargando, error, vista } = busqueda;

  const [sitioReservando, setSitioReservando] = useState(null);
  const [sitioDetalle, setSitioDetalle] = useState(null);

  const abrirReserva = (sitio) => {
    if (!usuario) { navigate("/login"); return; }
    setSitioReservando(sitio);
  };

  return (
    <div className="flex flex-col w-full">
      <CabeceraBusqueda filtros={filtros} totalCatalogo={busqueda.catalogoCompleto.length} onEditar={busqueda.editar} onAplicar={busqueda.aplicar} />
      <BarraFiltros
        filtros={filtros}
        categorias={busqueda.categorias}
        municipios={busqueda.municipios}
        totalCatalogo={busqueda.catalogoCompleto.length}
        onEditar={busqueda.editar}
        onAplicar={busqueda.aplicar}
        onOrden={busqueda.cambiarOrden}
      />

      <main className="max-w-[1360px] mx-auto px-gutter py-space-xl w-full">
        <div className="flex items-center justify-between mb-space-lg flex-wrap gap-2">
          <span className="font-title-lg text-title-lg text-on-surface font-semibold">
            {cargando ? "Buscando..." : `${resultado.total} destino(s) encontrado(s)`}
          </span>
          <div className="inline-flex rounded-xl bg-surface-container p-1">
            {VISTAS.map((v) => (
              <button
                key={v.id}
                onClick={() => busqueda.setVista(v.id)}
                className={`px-4 py-1.5 rounded-lg font-label-md text-label-md flex items-center gap-1.5 transition-colors ${vista === v.id ? "bg-primary-container text-on-primary shadow-sm" : "text-on-surface-variant hover:text-on-surface"}`}
              >
                <span className="material-symbols-outlined text-[18px]">{v.icono}</span>
                {v.label}
              </button>
            ))}
          </div>
        </div>

        {error && <p className="text-error font-body-sm text-body-sm mb-4">{error}</p>}

        {!cargando && resultado.resultados.length === 0 && !error && (
          <p className="text-on-surface-variant font-body-md text-body-md">No se encontraron resultados. Intenta ampliar los filtros de búsqueda.</p>
        )}

        {vista === "mapa" && (busqueda.cargandoMapa ? (
          <p className="text-on-surface-variant font-body-md text-body-md">Cargando mapa...</p>
        ) : (
          <MapaSitios sitios={busqueda.sitiosMapa} ubicacionUsuario={filtros.lat && filtros.lng ? { lat: Number(filtros.lat), lng: Number(filtros.lng) } : null} />
        ))}

        <div className={`grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-space-lg ${vista === "mapa" ? "hidden" : ""}`}>
          {resultado.resultados.map((sitio) => (
            <TarjetaSitio key={sitio.id} sitio={sitio} esAdmin={esAdmin} onReservar={abrirReserva} onInfo={setSitioDetalle} />
          ))}
        </div>

        {vista === "lista" && resultado.total_paginas > 1 && (
          <Paginacion pagina={resultado.page} total={resultado.total_paginas} onIr={busqueda.irPagina} />
        )}

        <BannerItinerario />
      </main>

      {sitioReservando && <ModalReservaRapida sitio={sitioReservando} onCerrar={() => setSitioReservando(null)} />}
      {sitioDetalle && <ModalInfoSitio sitio={sitioDetalle} onCerrar={() => setSitioDetalle(null)} />}
    </div>
  );
}
