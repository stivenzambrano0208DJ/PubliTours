import { useEffect, useState } from "react";
import { api } from "../api/client";
import { useAuth } from "../context/auth";
import Modal from "./Modal";
import { useIdioma } from "../context/idioma";

const ESPERA_REENVIO = 60;

// Ventana que bloquea la aplicación mientras el correo no esté confirmado: pide el código de 6 dígitos y permite reenviarlo o cerrar sesión.
// No se puede cerrar (ni con Escape ni tocando fuera): hasta verificar, no se usa PubliTours. El administrador queda fuera de esta regla.
export default function AvisoVerificarCorreo() {
  const { t } = useIdioma();
  const { usuario, actualizarUsuario, logout } = useAuth();
  const [codigo, setCodigo] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [mensaje, setMensaje] = useState(null);
  const [espera, setEspera] = useState(0);

  useEffect(() => {
    if (espera <= 0) return;
    const t = setTimeout(() => setEspera((e) => e - 1), 1000);
    return () => clearTimeout(t);
  }, [espera]);

  if (!usuario || usuario.correo_verificado !== false || usuario.rol === "administrador") return null;

  const verificar = async (e) => {
    e.preventDefault();
    setEnviando(true);
    setMensaje(null);
    try {
      await api.verificarCorreo(codigo);
      actualizarUsuario({ correo_verificado: true });
    } catch (err) {
      setMensaje({ ok: false, texto: err.message });
    } finally {
      setEnviando(false);
    }
  };

  const reenviar = async () => {
    setMensaje(null);
    try {
      await api.reenviarVerificacion();
      setEspera(ESPERA_REENVIO);
      setMensaje({ ok: true, texto: t("Te enviamos un código nuevo a {correo}.", { correo: usuario.correo }) });
    } catch (err) {
      setMensaje({ ok: false, texto: err.message });
    }
  };

  return (
    <Modal
      tituloId="titulo-verificar-correo" onCerrar={() => {}} cerrarConEscape={false} cerrarAlPulsarFondo={false} fondo="bg-black/60 z-[80] items-center p-4"
      className="w-full max-w-md max-h-[92vh] overflow-y-auto bg-surface-container-lowest rounded-2xl p-6 shadow-2xl flex flex-col gap-4"
    >
      <div className="flex flex-col items-center text-center gap-2">
        <span className="w-14 h-14 rounded-full bg-tertiary-fixed text-on-tertiary-fixed-variant flex items-center justify-center">
          <span className="material-symbols-outlined text-[30px]" aria-hidden="true">mark_email_unread</span>
        </span>
        <h2 id="titulo-verificar-correo" className="font-headline-md text-headline-md text-primary">{t("Verifica tu correo para continuar")}</h2>
        <p className="font-body-sm text-body-sm text-on-surface-variant">
          {t("Te enviamos un código de 6 dígitos a")} <strong className="text-on-surface break-all">{usuario.correo}</strong>.{" "}
          {t("Para usar PubliTours necesitas confirmarlo. Si no lo ves, revisa también la carpeta de spam.")}
        </p>
      </div>

      <form onSubmit={verificar} className="flex flex-col gap-3">
        <input
          inputMode="numeric"
          autoComplete="one-time-code"
          maxLength={6}
          placeholder={t("Código de 6 dígitos")}
          aria-label={t("Código de verificación")}
          value={codigo}
          onChange={(e) => setCodigo(e.target.value.replace(/\D/g, ""))}
          className="w-full px-3 py-3 rounded-xl bg-surface-container-low border border-surface-container-high outline-none focus:border-secondary tracking-[0.4em] text-center font-title-lg text-title-lg"
        />
        {mensaje && <p role="status" className={`font-label-md text-label-md text-center ${mensaje.ok ? "text-secondary" : "text-error"}`}>{mensaje.texto}</p>}
        <button type="submit" disabled={enviando || codigo.length !== 6} className="w-full py-3 rounded-xl bg-primary text-on-primary font-label-md text-label-md font-semibold hover:bg-primary-container transition-colors disabled:opacity-50">
          {enviando ? t("Verificando...") : t("Verificar")}
        </button>
        <div className="flex items-center justify-between gap-2">
          <button type="button" onClick={reenviar} disabled={espera > 0} className="px-3 py-2 rounded-xl text-secondary font-label-md text-label-md hover:bg-surface-container transition-colors disabled:opacity-50">
            {espera > 0 ? t("Reenviar en {n} s", { n: espera }) : t("Reenviar código")}
          </button>
          <button type="button" onClick={logout} className="px-3 py-2 rounded-xl text-on-surface-variant font-label-md text-label-md hover:bg-surface-container transition-colors">
            {t("Cerrar sesión")}
          </button>
        </div>
      </form>
    </Modal>
  );
}
