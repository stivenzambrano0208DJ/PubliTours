// Cómo se llama cada motivo de reporte de un mensaje. Las claves las define el servidor (GET /configuracion → mensajeria.motivos_reporte).
export const MOTIVOS_REPORTE = {
  spam: "Spam o publicidad",
  ofensivo: "Lenguaje ofensivo o acoso",
  contacto_externo: "Pide datos personales o pagos de forma sospechosa",
  estafa: "Posible estafa o engaño",
  otro: "Otro motivo",
};
