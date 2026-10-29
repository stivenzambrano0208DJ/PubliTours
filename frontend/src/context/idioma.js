import { createContext, useContext } from "react";
import EN, { DATOS as DATOS_EN } from "../i18n/en";

// Idioma de la interfaz. Los textos se escriben en español dentro del código, envueltos en t('…'); el diccionario de cada idioma
// (src/i18n/en.js) los traduce. Si un texto no tiene traducción se muestra en español: nunca queda vacío.
//   t('Hola, {nombre}', { nombre }) — los {marcadores} se reemplazan por sus valores en cualquier idioma.
// Lo que escribe cada negocio (nombres, descripciones) y los mensajes del servidor siguen en español.
export const IDIOMAS = ["es", "en"];
const DICCIONARIOS = { en: EN };
// Valores que vienen de la base de datos y se muestran tal cual (categorías, tipos de viaje): se traducen al mostrarlos, sin cambiar lo guardado.
const DATOS = { en: DATOS_EN };
export const traducirDato = (idioma, valor) => (idioma !== "es" && DATOS[idioma]?.[valor]) || valor;

export function traducir(idioma, texto, valores) {
  const base = (idioma !== "es" && DICCIONARIOS[idioma]?.[texto]) || texto;
  return valores ? base.replace(/\{(\w+)\}/g, (marca, clave) => (clave in valores ? String(valores[clave]) : marca)) : base;
}

// Localización de fechas y números según el idioma (los precios siguen en pesos colombianos).
export const LOCALES = { es: "es-CO", en: "en-US" };

// Sin IdiomaProvider (por ejemplo, en una prueba aislada) todo queda en español: así nada se rompe.
const RESPALDO = { idioma: "es", locale: LOCALES.es, cambiarIdioma: () => {}, t: (texto, valores) => traducir("es", texto, valores), td: (valor) => valor };

export const IdiomaContext = createContext(null);

export function useIdioma() {
  return useContext(IdiomaContext) || RESPALDO;
}
