// ¿El servicio tiene tarifas distintas a "precio × personas"? (niños, temporadas o descuento por grupo)
export const tieneTarifaAvanzada = (s) =>
  s.precio_nino != null || Boolean(s.grupo_min_personas) || Boolean(s.tiene_temporadas) || Boolean(s.tarifas?.length);

// Portada del paquete: su propia foto o, si no tiene, la del primer servicio que tenga foto.
export const portadaDelPaquete = (paquete) => paquete.imagen_url || paquete.items?.map((i) => i.sitio?.imagen_url).find(Boolean) || null;
