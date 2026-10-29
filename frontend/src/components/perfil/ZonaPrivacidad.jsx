import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "../../api/client";
import { useAuth } from "../../context/auth";
import { descargarArchivo } from "../../utils/descarga";
import { CAMPO_ANCHO } from "../../estilos";
import { useIdioma } from "../../context/idioma";


// Datos personales: descargar una copia y eliminar la cuenta (con la contraseña como confirmación).
export default function ZonaPrivacidad() {
  const { t } = useIdioma();
  const { logout } = useAuth();
  const navigate = useNavigate();
  const [descargando, setDescargando] = useState(false);
  const [errorDescarga, setErrorDescarga] = useState("");

  const [confirmando, setConfirmando] = useState(false);
  const [password, setPassword] = useState("");
  const [eliminando, setEliminando] = useState(false);
  const [errorEliminar, setErrorEliminar] = useState("");

  const descargar = async () => {
    setDescargando(true);
    setErrorDescarga("");
    try {
      const datos = await api.misDatos();
      descargarArchivo(new Blob([JSON.stringify(datos, null, 2)], { type: "application/json" }), "mis-datos-publitours.json");
    } catch (err) {
      setErrorDescarga(err.message);
    } finally {
      setDescargando(false);
    }
  };

  const eliminar = async (e) => {
    e.preventDefault();
    setEliminando(true);
    setErrorEliminar("");
    try {
      await api.eliminarCuenta(password);
      logout();
      navigate("/", { replace: true });
    } catch (err) {
      setErrorEliminar(err.message);
      setEliminando(false);
    }
  };

  return (
    <section aria-labelledby="privacidad" className="lg:col-span-2 bg-surface-container-lowest rounded-2xl p-space-lg shadow-sm flex flex-col gap-5">
      <h2 id="privacidad" className="font-title-lg text-title-lg text-on-surface font-semibold">{t("Tus datos y tu cuenta")}</h2>

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <p className="font-body-md text-body-md text-on-surface-variant max-w-[60ch]">
          {t("Descarga una copia de lo que PubliTours guarda sobre ti: tu cuenta, reservas, reseñas, favoritos, itinerarios y notificaciones (y tu negocio, si tienes uno). No incluye contraseñas.")}
        </p>
        <button type="button" onClick={descargar} disabled={descargando} className="shrink-0 px-5 py-2.5 rounded-xl bg-surface-container text-on-surface font-label-md text-label-md hover:bg-surface-container-high transition-colors disabled:opacity-60">
          {descargando ? t("Preparando...") : t("Descargar mis datos")}
        </button>
      </div>
      {errorDescarga && <p role="alert" className="font-body-sm text-body-sm text-error">{errorDescarga}</p>}

      <hr className="border-surface-container-high" />

      {!confirmando ? (
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <p className="font-body-md text-body-md text-on-surface-variant max-w-[60ch]">
            {t("Eliminar tu cuenta es definitivo: no podrás volver a entrar y se borran tus favoritos, itinerarios y notificaciones. Si tienes un negocio, sus servicios y paquetes dejan de publicarse. Necesitas no tener reservas pendientes ni próximas.")}
          </p>
          <button type="button" onClick={() => setConfirmando(true)} className="shrink-0 px-5 py-2.5 rounded-xl border border-error text-error font-label-md text-label-md hover:bg-error-container/40 transition-colors">
            {t("Eliminar mi cuenta")}
          </button>
        </div>
      ) : (
        <form onSubmit={eliminar} className="flex flex-col gap-3 max-w-md">
          <label className="flex flex-col gap-1.5">
            <span className="font-label-md text-label-md text-on-surface font-semibold">{t("Escribe tu contraseña para confirmar")}</span>
            <input type="password" className={CAMPO_ANCHO} required autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} />
          </label>
          {errorEliminar && <p role="alert" className="font-body-sm text-body-sm text-error">{errorEliminar}</p>}
          <div className="flex gap-2">
            <button type="submit" disabled={eliminando || !password} className="px-5 py-2.5 rounded-xl bg-error text-on-error font-label-md text-label-md disabled:opacity-60">
              {eliminando ? t("Eliminando...") : t("Sí, eliminar definitivamente")}
            </button>
            <button type="button" onClick={() => { setConfirmando(false); setPassword(""); setErrorEliminar(""); }} className="px-5 py-2.5 rounded-xl bg-surface-container text-on-surface font-label-md text-label-md hover:bg-surface-container-high transition-colors">
              {t("Cancelar")}
            </button>
          </div>
        </form>
      )}
    </section>
  );
}
