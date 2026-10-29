import { useIdioma } from "../../context/idioma";
function Dato({ icono, etiqueta, children }) {
  return (
    <div className="flex flex-col gap-1 p-3 rounded-xl bg-surface-container-lowest shadow-sm">
      <div className="flex items-center gap-1.5 text-secondary font-label-xs text-label-xs font-semibold">
        <span className="material-symbols-outlined text-[18px]">{icono}</span>
        <span>{etiqueta}</span>
      </div>
      <p className="font-title-sm text-title-sm text-primary">{children}</p>
    </div>
  );
}

// Datos del servicio tal como los registró el prestador; lo que falta se dice con honestidad.
export default function FichaTecnica({ sitio }) {
  const { t, td } = useIdioma();
  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-4 rounded-2xl bg-surface-container-low">
      <Dato icono="payments" etiqueta={t("Precio")}>
        {Number(sitio.precio) === 0 ? t("Gratuito") : `$${Number(sitio.precio).toLocaleString("es-CO")}`}
      </Dato>
      <Dato icono="schedule" etiqueta={t("Horario")}>{sitio.horario || t("No registrado")}</Dato>
      <Dato icono="category" etiqueta={t("Categoría")}>{td(sitio.categoria)}</Dato>
      <Dato icono="sell" etiqueta={t("Tipo de viaje")}>{sitio.tipo_viaje ? sitio.tipo_viaje.split(",").map((v) => v.replace(v.trim(), td(v.trim()))).join(",") : t("No registrado")}</Dato>
    </div>
  );
}
