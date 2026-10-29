// Cómo se llama cada motivo de un caso de soporte. Las claves las define el servidor (GET /configuracion → soporte.motivos_caso).
export const MOTIVOS_CASO = {
  no_presto_servicio: "El negocio no prestó el servicio o no se presentó",
  servicio_diferente: "El servicio fue distinto a lo publicado",
  cancelacion_o_cambio: "Un problema con una cancelación o un cambio",
  trato_o_seguridad: "Trato inadecuado o un problema de seguridad",
  no_asistio_turista: "El turista no se presentó o no respetó lo acordado",
  otro: "Otro problema",
};

// El turista no reporta su propia inasistencia ni el negocio que él mismo no prestó el servicio.
const SOLO_NEGOCIO = ["no_asistio_turista"];
const SOLO_TURISTA = ["no_presto_servicio"];
export const motivosPara = (rol, claves) =>
  (claves || Object.keys(MOTIVOS_CASO)).filter((m) => (rol === "prestador" ? !SOLO_TURISTA.includes(m) : !SOLO_NEGOCIO.includes(m)));

export const ESTADOS_CASO = {
  abierto: { texto: "Abierto", chip: "bg-tertiary-fixed text-on-tertiary-fixed-variant" },
  en_revision: { texto: "En revisión", chip: "bg-secondary-container text-on-secondary-container" },
  resuelto: { texto: "Resuelto", chip: "bg-primary-fixed text-on-primary-fixed-variant" },
};
