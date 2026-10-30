// Insignia de la plataforma: la píldora pequeña que muestra un estado ("Publicado", "Suspendida") o rotula una sección.
//  - tono: "activo" (verde, lo que está funcionando), "inactivo" (gris, pausado u oculto), "error" (rojo, suspendido o con problema)
//    y "etiqueta" (verde suave para rotular el encabezado de una página o sección).
//  - punto: añade el punto de color delante del texto, que refuerza el estado sin depender solo del color.
// El texto lo pone quien la usa (ya traducido); el margen y la posición, con className.
const TONOS = {
  activo: { chip: "bg-secondary-container/50 text-on-secondary-container", punto: "bg-secondary" },
  inactivo: { chip: "bg-surface-container-high text-on-surface-variant", punto: "bg-outline" },
  error: { chip: "bg-error-container text-error", punto: "bg-error" },
  etiqueta: { chip: "bg-secondary-container/40 text-secondary", punto: "bg-secondary" },
};

export default function Insignia({ tono = "inactivo", punto = false, className = "", children, ...props }) {
  const { chip, punto: colorPunto } = TONOS[tono];
  const forma = tono === "etiqueta" ? "inline-flex items-center gap-1.5 px-3 py-1" : punto ? "inline-flex items-center gap-1.5 px-2.5 py-1" : "px-2.5 py-0.5";
  return (
    <span className={`${forma} rounded-full font-label-xs text-label-xs font-semibold ${chip} ${className}`.trim()} {...props}>
      {punto && <span aria-hidden="true" className={`w-2 h-2 rounded-full ${colorPunto}`} />}
      {children}
    </span>
  );
}
