import { Link, Navigate } from "react-router-dom";
import { useAuth } from "../context/auth";
import { useIdioma } from "../context/idioma";

export default function ProtectedRoute({ roles, children }) {
  const { t } = useIdioma();
  const { usuario, cargando } = useAuth();

  if (cargando) {
    return (
      <div className="max-w-[1360px] mx-auto px-gutter py-space-xl flex items-center justify-center">
        <p className="font-body-md text-body-md text-on-surface-variant">{t("Cargando...")}</p>
      </div>
    );
  }
  if (!usuario) return <Navigate to="/login" replace />;
  if (roles && !roles.includes(usuario.rol)) {
    return (
      <div className="max-w-md mx-auto px-gutter py-space-xl text-center flex flex-col items-center gap-3">
        <span className="material-symbols-outlined text-error text-[40px]">block</span>
        <h1 className="font-headline-md text-headline-md text-on-surface">{t("No tienes permiso para ver esta página")}</h1>
        <p className="font-body-md text-body-md text-on-surface-variant">
          {t("Esta sección está reservada para otro tipo de cuenta.")}
        </p>
        <Link
          to="/"
          className="mt-2 inline-flex items-center gap-2 px-space-lg py-2.5 rounded-xl bg-primary text-on-primary font-label-md text-label-md hover:bg-primary-container transition-colors"
        >
          {t("Volver al inicio")}
        </Link>
      </div>
    );
  }
  return children;
}
