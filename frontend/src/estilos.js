// Clases de los campos de formulario: una sola fuente de verdad (antes cada pantalla tenía su copia con pequeñas variaciones).
const BASE_CAMPO = "rounded-xl bg-surface-container-low border border-surface-container-high outline-none focus:border-secondary";

// Formularios del portal, el perfil y los modales.
export const CAMPO = `px-4 py-2.5 ${BASE_CAMPO}`;
export const CAMPO_ANCHO = `w-full ${CAMPO}`;
export const CAMPO_COMPACTO = `px-3 py-2 ${BASE_CAMPO}`;

// Pantallas de acceso y registro: letra, color de marcador y transición de enfoque más cuidados.
export const CAMPO_AUTH = "w-full px-4 py-2.5 bg-surface-container-low border border-surface-container-high rounded-xl text-on-surface font-body-md text-body-md placeholder:text-outline focus:bg-surface-container-lowest focus:border-secondary transition-all outline-none";
// Igual, con espacio a la izquierda para un ícono dentro del campo.
export const CAMPO_AUTH_ICONO = CAMPO_AUTH.replace("px-4", "pl-11 pr-4");
