import { useEffect } from "react";
import { Link } from "react-router-dom";
import { MapContainer, Marker, Popup, CircleMarker, useMap } from "react-leaflet";
import L from "leaflet";
import { CENTRO_CAQUETA } from "../constants";
import "./mapa/configurarLeaflet";
import CapasBase from "./mapa/CapasBase";

function AjustarVista({ puntos, usuario }) {
  const map = useMap();
  useEffect(() => {
    const todos = usuario ? [...puntos, usuario] : puntos;
    if (todos.length === 0) return;
    if (todos.length === 1) map.setView(todos[0], 13);
    else map.fitBounds(L.latLngBounds(todos), { padding: [40, 40], maxZoom: 14 });
  }, [map, puntos, usuario]);
  return null;
}

// Mapa con todos los sitios que tienen ubicación; cada marcador abre una tarjeta con enlace al detalle.
export default function MapaSitios({ sitios, ubicacionUsuario }) {
  const conUbicacion = sitios.filter((s) => s.latitud && s.longitud);
  const puntos = conUbicacion.map((s) => [Number(s.latitud), Number(s.longitud)]);
  const usuario = ubicacionUsuario ? [ubicacionUsuario.lat, ubicacionUsuario.lng] : null;

  return (
    <div className="flex flex-col gap-3">
      <div className="relative isolate z-0 h-[520px] w-full rounded-2xl overflow-hidden border border-surface-container-high">
        <MapContainer center={CENTRO_CAQUETA} zoom={9} style={{ height: "100%", width: "100%" }}>
          <CapasBase />
          <AjustarVista puntos={puntos} usuario={usuario} />
          {conUbicacion.map((s) => (
            <Marker key={s.id} position={[Number(s.latitud), Number(s.longitud)]}>
              <Popup>
                <div className="flex flex-col gap-1 min-w-[160px]">
                  <strong className="text-[14px]">{s.nombre}</strong>
                  <span className="text-[12px] text-gray-600">{s.municipio} · {s.categoria}</span>
                  <span className="text-[13px] font-semibold">
                    {Number(s.precio) === 0 ? "Gratuito" : `$${Number(s.precio).toLocaleString("es-CO")} COP`}
                  </span>
                  {s.distancia_km != null && <span className="text-[12px] text-gray-600">A {Number(s.distancia_km).toFixed(1)} km de ti</span>}
                  <Link to={`/sitios/${s.id}`} className="text-[13px] font-semibold text-emerald-800 underline">Ver detalle</Link>
                </div>
              </Popup>
            </Marker>
          ))}
          {usuario && <CircleMarker center={usuario} radius={9} pathOptions={{ color: "#1d4ed8", fillColor: "#3b82f6", fillOpacity: 0.8 }}><Popup>Tu ubicación</Popup></CircleMarker>}
        </MapContainer>
      </div>
      <p className="font-label-xs text-label-xs text-on-surface-variant">
        {conUbicacion.length} de {sitios.length} destino(s) tienen ubicación en el mapa.
        {sitios.length > conUbicacion.length && " Los demás aún no tienen coordenadas registradas por su prestador."}
      </p>
    </div>
  );
}
