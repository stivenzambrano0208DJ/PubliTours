import { MapContainer, Marker } from "react-leaflet";
import "./configurarLeaflet";
import CapasBase from "./CapasBase";

export default function MapaVisor({ lat, lng, nombre }) {
  const posicion = [Number(lat), Number(lng)];
  const urlIndicaciones = `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`;

  return (
    <div className="flex flex-col gap-2">
      <div className="relative isolate z-0 h-64 w-full rounded-2xl overflow-hidden border border-surface-container-high">
        <MapContainer center={posicion} zoom={14} style={{ height: "100%", width: "100%" }} scrollWheelZoom={false}>
          <CapasBase />
          <Marker position={posicion} />
        </MapContainer>
      </div>
      <a
        href={urlIndicaciones}
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex items-center justify-center gap-1.5 py-2.5 rounded-xl bg-surface-container text-primary hover:bg-surface-container-high font-label-md text-label-md font-semibold transition-colors"
      >
        <span className="material-symbols-outlined text-[18px]">directions</span>
        Cómo llegar a {nombre}
      </a>
    </div>
  );
}
