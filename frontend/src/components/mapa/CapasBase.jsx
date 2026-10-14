import { LayersControl, LayerGroup, TileLayer, useMapEvents } from "react-leaflet";
import { OSM_ATTRIBUTION, OSM_URL } from "./configurarLeaflet";

const ESRI = "https://server.arcgisonline.com/ArcGIS/rest/services";
const ESRI_ATTRIBUTION = "Imágenes &copy; Esri, Maxar, Earthstar Geographics y la comunidad GIS";
const CLAVE = "publitours_capa_mapa";
const CAPAS = ["Calles", "Satélite", "Híbrido"];

// Recuerda la última capa elegida para que los tres mapas de la plataforma abran igual.
function leerCapa() {
  try {
    const guardada = localStorage.getItem(CLAVE);
    return CAPAS.includes(guardada) ? guardada : "Calles";
  } catch {
    return "Calles";
  }
}

function RecordarCapa() {
  useMapEvents({
    baselayerchange(e) {
      try { localStorage.setItem(CLAVE, e.name); } catch { /* sin almacenamiento: no se recuerda */ }
    },
  });
  return null;
}

// Capas base del mapa: calles (OpenStreetMap), satélite (fotos reales del terreno) e híbrido
// (satélite con carreteras y nombres de lugares). Todas gratuitas y sin clave de API.
export default function CapasBase() {
  const inicial = leerCapa();
  // Las fotos de satélite tienen cobertura real hasta ~zoom 17 en zonas rurales; más allá se amplían.
  const satelite = { maxNativeZoom: 17, maxZoom: 19 };

  return (
    <>
      <LayersControl position="topright">
        <LayersControl.BaseLayer checked={inicial === "Calles"} name="Calles">
          <TileLayer attribution={OSM_ATTRIBUTION} url={OSM_URL} maxZoom={19} />
        </LayersControl.BaseLayer>

        <LayersControl.BaseLayer checked={inicial === "Satélite"} name="Satélite">
          <TileLayer attribution={ESRI_ATTRIBUTION} url={`${ESRI}/World_Imagery/MapServer/tile/{z}/{y}/{x}`} {...satelite} />
        </LayersControl.BaseLayer>

        <LayersControl.BaseLayer checked={inicial === "Híbrido"} name="Híbrido">
          <LayerGroup>
            <TileLayer attribution={ESRI_ATTRIBUTION} url={`${ESRI}/World_Imagery/MapServer/tile/{z}/{y}/{x}`} {...satelite} />
            <TileLayer url={`${ESRI}/Reference/World_Transportation/MapServer/tile/{z}/{y}/{x}`} {...satelite} />
            <TileLayer url={`${ESRI}/Reference/World_Boundaries_and_Places/MapServer/tile/{z}/{y}/{x}`} {...satelite} />
          </LayerGroup>
        </LayersControl.BaseLayer>
      </LayersControl>
      <RecordarCapa />
    </>
  );
}
