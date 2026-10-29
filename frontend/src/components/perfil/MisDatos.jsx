import { useState } from "react";
import { api } from "../../api/client";
import { useAuth } from "../../context/auth";
import ZonaPrivacidad from "./ZonaPrivacidad";
import { CAMPO_ANCHO } from "../../estilos";
import { useIdioma } from "../../context/idioma";


function Mensaje({ estado }) {
  if (!estado) return null;
  return <p className={`font-body-sm text-body-sm ${estado.ok ? "text-secondary" : "text-error"}`}>{estado.texto}</p>;
}

export default function MisDatos() {
  const { t } = useIdioma();
  const { usuario, actualizarUsuario } = useAuth();
  const [datos, setDatos] = useState({ nombre: usuario?.nombre || "", correo: usuario?.correo || "" });
  const [guardandoDatos, setGuardandoDatos] = useState(false);
  const [estadoDatos, setEstadoDatos] = useState(null);

  const [clave, setClave] = useState({ actual: "", nueva: "", repetir: "" });
  const [guardandoClave, setGuardandoClave] = useState(false);
  const [estadoClave, setEstadoClave] = useState(null);

  const guardarDatos = async (e) => {
    e.preventDefault();
    setGuardandoDatos(true);
    setEstadoDatos(null);
    try {
      actualizarUsuario(await api.actualizarPerfil(datos));
      setEstadoDatos({ ok: true, texto: t("Datos actualizados.") });
    } catch (err) {
      setEstadoDatos({ ok: false, texto: err.message });
    } finally {
      setGuardandoDatos(false);
    }
  };

  const guardarClave = async (e) => {
    e.preventDefault();
    if (clave.nueva !== clave.repetir) { setEstadoClave({ ok: false, texto: t("Las contraseñas nuevas no coinciden.") }); return; }
    setGuardandoClave(true);
    setEstadoClave(null);
    try {
      await api.cambiarPassword({ actual: clave.actual, nueva: clave.nueva }); // las demás sesiones se cierran; el servidor renueva la cookie de esta
      setClave({ actual: "", nueva: "", repetir: "" });
      setEstadoClave({ ok: true, texto: t("Contraseña actualizada.") });
    } catch (err) {
      setEstadoClave({ ok: false, texto: err.message });
    } finally {
      setGuardandoClave(false);
    }
  };

  return (
    <section className="grid grid-cols-1 lg:grid-cols-2 gap-space-lg">
      <form onSubmit={guardarDatos} className="bg-surface-container-lowest rounded-2xl p-space-lg shadow-sm flex flex-col gap-4">
        <h2 className="font-title-lg text-title-lg text-on-surface font-semibold">{t("Mis datos")}</h2>
        <label className="flex flex-col gap-1.5">
          <span className="font-label-md text-label-md text-on-surface font-semibold">{t("Nombre")}</span>
          <input className={CAMPO_ANCHO} required minLength={2} value={datos.nombre} onChange={(e) => setDatos({ ...datos, nombre: e.target.value })} />
        </label>
        <label className="flex flex-col gap-1.5">
          <span className="font-label-md text-label-md text-on-surface font-semibold">{t("Correo electrónico")}</span>
          <input type="email" className={CAMPO_ANCHO} required value={datos.correo} onChange={(e) => setDatos({ ...datos, correo: e.target.value })} />
        </label>
        <Mensaje estado={estadoDatos} />
        <button type="submit" disabled={guardandoDatos} className="self-start px-5 py-2.5 rounded-xl bg-primary text-on-primary font-label-md text-label-md hover:bg-primary-container transition-colors disabled:opacity-60">
          {guardandoDatos ? t("Guardando...") : t("Guardar cambios")}
        </button>
      </form>

      <form onSubmit={guardarClave} className="bg-surface-container-lowest rounded-2xl p-space-lg shadow-sm flex flex-col gap-4">
        <h2 className="font-title-lg text-title-lg text-on-surface font-semibold">{t("Cambiar contraseña")}</h2>
        <label className="flex flex-col gap-1.5">
          <span className="font-label-md text-label-md text-on-surface font-semibold">{t("Contraseña actual")}</span>
          <input type="password" className={CAMPO_ANCHO} required autoComplete="current-password" value={clave.actual} onChange={(e) => setClave({ ...clave, actual: e.target.value })} />
        </label>
        <label className="flex flex-col gap-1.5">
          <span className="font-label-md text-label-md text-on-surface font-semibold">{t("Nueva contraseña")}</span>
          <input type="password" className={CAMPO_ANCHO} required minLength={8} autoComplete="new-password" placeholder={t("Mínimo 8 caracteres")} value={clave.nueva} onChange={(e) => setClave({ ...clave, nueva: e.target.value })} />
        </label>
        <label className="flex flex-col gap-1.5">
          <span className="font-label-md text-label-md text-on-surface font-semibold">{t("Repite la nueva contraseña")}</span>
          <input type="password" className={CAMPO_ANCHO} required minLength={8} autoComplete="new-password" value={clave.repetir} onChange={(e) => setClave({ ...clave, repetir: e.target.value })} />
        </label>
        <Mensaje estado={estadoClave} />
        <button type="submit" disabled={guardandoClave} className="self-start px-5 py-2.5 rounded-xl bg-primary text-on-primary font-label-md text-label-md hover:bg-primary-container transition-colors disabled:opacity-60">
          {guardandoClave ? t("Guardando...") : t("Actualizar contraseña")}
        </button>
      </form>
      <ZonaPrivacidad />
    </section>
  );
}
