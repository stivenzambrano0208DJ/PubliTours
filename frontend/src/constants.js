// Constantes compartidas por varias pantallas (una sola fuente de verdad).

export const CATEGORIA_ICONOS = {
  Naturaleza: "forest",
  Hospedaje: "bed",
  Gastronomía: "restaurant",
  Aventura: "paragliding",
};

export const CATEGORIA_GRADIENTE = {
  Naturaleza: "from-secondary to-primary-container",
  Hospedaje: "from-primary-container to-tertiary-container",
  Gastronomía: "from-tertiary-fixed to-secondary",
  Aventura: "from-primary to-secondary-fixed-dim",
};

export const TIPOS_VIAJE = [
  { value: "", label: "Todos" },
  { value: "pareja", label: "Pareja" },
  { value: "familia", label: "Familia" },
  { value: "naturaleza", label: "Naturaleza" },
  { value: "aventura", label: "Aventura" },
  { value: "negocios", label: "Negocios" },
];

export const CATEGORIAS_NEGOCIO = [
  { value: "Naturaleza", label: "Naturaleza y Guianza", detalle: "Senderismo, avistamiento de aves", icono: "forest" },
  { value: "Aventura", label: "Deportes y Aventura", detalle: "Rafting, kayak, canyoning", icono: "paragliding" },
  { value: "Hospedaje", label: "Hospedaje / Glamping", detalle: "Posadas, fincas, cabañas", icono: "bed" },
  { value: "Gastronomía", label: "Gastronomía Amazónica", detalle: "Sabores locales y catas", icono: "restaurant" },
];

export const MUNICIPIOS_CAQUETA = [
  "Florencia", "Albania", "Belén de los Andaquíes", "Cartagena del Chairá", "Curillo", "El Doncello",
  "El Paujil", "La Montañita", "Milán", "Morelia", "Puerto Rico", "San José del Fragua",
  "San Vicente del Caguán", "Solano", "Solita", "Valparaíso",
];

// Centro del mapa cuando aún no hay coordenadas (Florencia, Caquetá).
export const CENTRO_CAQUETA = [1.6144, -75.6062];

// Mínimo recomendado (px, lado corto) para fotos de sitios.
export const RESOLUCION_MINIMA_RECOMENDADA = 800;

// Debe coincidir con backend/src/config/terminos.js
export const VERSION_TERMINOS = "2026-10";

export function fechaMinima() {
  const f = new Date();
  f.setDate(f.getDate() + 1);
  return f.toISOString().slice(0, 10);
}
