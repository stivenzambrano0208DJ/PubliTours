// Mismas reglas que el servidor (prestadorService.camposFaltantes) para mostrar el avance en vivo.
export const requisitos = (f) => [
  { clave: "basico", texto: "Datos básicos del negocio", ok: Boolean(f.nombre_negocio.trim() && f.categoria && f.municipio) },
  { clave: "descripcion", texto: "Descripción (mínimo 30 caracteres)", ok: f.descripcion.trim().length >= 30 },
  { clave: "telefono", texto: "WhatsApp de contacto", ok: /^\d{7,15}$/.test(f.telefono) },
  { clave: "direccion", texto: "Dirección o cómo llegar", ok: f.direccion.trim().length >= 5 },
];
