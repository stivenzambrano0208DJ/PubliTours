import { useEffect, useState } from "react";
import { api } from "../api/client";
import { useAuth } from "../context/auth";

const ESPERA_REENVIO = 60;

// Franja bajo el encabezado para quien aún no confirmó su correo: pide el código de 6 dígitos y permite reenviarlo.
export default function AvisoVerificarCorreo() {
  const { usuario, actualizarUsuario } = useAuth();
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
      setMensaje({ ok: true, texto: `Te enviamos un código nuevo a ${usuario.correo}.` });
    } catch (err) {
      setMensaje({ ok: false, texto: err.message });
    }
  };

  return (
    <div role="region" aria-label="Verifica tu correo" data-libre-tarjeta className="print:hidden w-full bg-tertiary-fixed/60 border-b border-tertiary-fixed-dim text-on-surface">
      <div className="max-w-[1360px] mx-auto px-gutter py-3 flex flex-col lg:flex-row lg:items-center gap-3">
        <div className="flex items-start gap-2 flex-1 min-w-0">
          <span className="material-symbols-outlined text-on-tertiary-container text-[22px] shrink-0">mark_email_unread</span>
          <p className="font-body-sm text-body-sm">
            <strong>Verifica tu correo.</strong> Te enviamos un código de 6 dígitos a <strong>{usuario.correo}</strong>. Mientras tanto puedes explorar,
            pero para reservar o enviar tu negocio a revisión necesitas confirmarlo.
          </p>
        </div>
        <form onSubmit={verificar} className="flex flex-wrap items-center gap-2">
          <input
            inputMode="numeric"
            autoComplete="one-time-code"
            maxLength={6}
            placeholder="Código de 6 dígitos"
            aria-label="Código de verificación"
            value={codigo}
            onChange={(e) => setCodigo(e.target.value.replace(/\D/g, ""))}
            className="w-44 px-3 py-2 rounded-xl bg-surface-container-lowest border border-surface-container-high outline-none focus:border-secondary tracking-widest text-center"
          />
          <button type="submit" disabled={enviando || codigo.length !== 6} className="px-4 py-2 rounded-xl bg-primary text-on-primary font-label-md text-label-md hover:bg-primary-container transition-colors disabled:opacity-50">
            {enviando ? "Verificando..." : "Verificar"}
          </button>
          <button type="button" onClick={reenviar} disabled={espera > 0} className="px-3 py-2 rounded-xl text-secondary font-label-md text-label-md hover:bg-surface-container-lowest transition-colors disabled:opacity-50">
            {espera > 0 ? `Reenviar en ${espera} s` : "Reenviar código"}
          </button>
        </form>
      </div>
      {mensaje && (
        <p role="status" className={`max-w-[1360px] mx-auto px-gutter pb-2 font-label-md text-label-md ${mensaje.ok ? "text-secondary" : "text-error"}`}>{mensaje.texto}</p>
      )}
    </div>
  );
}
