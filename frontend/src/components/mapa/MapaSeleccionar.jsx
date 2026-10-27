import { useState } from "react";
import { MapContainer, Marker, useMapEvents } from "react-leaflet";
import { CENTRO_CAQUETA } from "../../constants";
import "./configurarLeaflet";
import CapasBase from "./CapasBase";
import { useAvisos } from "../../context/avisos";


function ClicMapa({ onSeleccionar }) {
  useMapEvents({
    click(e) {
      onSeleccionar(e.latlng.lat, e.latlng.lng);
    },
  });
  return null;
}

export default function MapaSeleccionar({ lat, lng, onCambiar }) {
  const { avisar } = useAvisos();
  const [detectando, setDetectando] = useState(false);
  const posicion = lat && lng ? [Number(lat), Number(lng)] : null;

  const detectarUbicacion = () => {
    if (!navigator.geolocation) {
      avisar("Tu navegador no soporta geolocalización.");
      return;
    }
    setDetectando(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        onCambiar(pos.coords.latitude, pos.coords.longitude);
        setDetectando(false);
      },
      () => {
        avisar("No se pudo obtener tu ubicación. Puedes marcarla manualmente en el mapa.");
        setDetectando(false);
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center justify-between">
        <span className="font-label-md text-label-md text-on-surface font-semibold">Ubicación en el mapa</span>
        <button
          type="button"
          onClick={detectarUbicacion}
          disabled={detectando}
          className="inline-flex items-center gap-1.5 text-secondary font-label-xs text-label-xs font-semibold hover:underline disabled:opacity-60"
        >
          <span className="material-symbols-outlined text-[16px]">my_location</span>
          {detectando ? "Detectando..." : "Usar mi ubicación actual"}
        </button>
      </div>
      <div className="relative isolate z-0 h-64 w-full rounded-xl overflow-hidden border border-surface-container-high">
        <MapContainer center={posicion || CENTRO_CAQUETA} zoom={posicion ? 14 : 9} style={{ height: "100%", width: "100%" }}>
          <CapasBase />
          <ClicMapa onSeleccionar={onCambiar} />
          {posicion && <Marker position={posicion} />}
        </MapContainer>
      </div>
      <p className="font-label-xs text-label-xs text-on-surface-variant">
        {posicion
          ? `Coordenadas: ${Number(lat).toFixed(5)}, ${Number(lng).toFixed(5)} — clic en el mapa para moverla.`
          : "Haz clic en el mapa para marcar la ubicación exacta, o usa tu ubicación actual."}
      </p>
    </div>
  );
}
