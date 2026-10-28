import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { api } from "../api/client";
import MarcaAuth from "../components/auth/MarcaAuth";
import BotonAuth from "../components/auth/BotonAuth";
import CampoAuth from "../components/auth/CampoAuth";

export default function OlvideContrasena() {
  const navigate = useNavigate();
  const [paso, setPaso] = useState("correo"); // correo -> codigo -> listo
  const [correo, setCorreo] = useState("");
  const [codigo, setCodigo] = useState("");
  const [password, setPassword] = useState("");
  const [confirmar, setConfirmar] = useState("");
  const [mostrarPassword, setMostrarPassword] = useState(false);
  const [error, setError] = useState("");
  const [cargando, setCargando] = useState(false);

  const handleSolicitarCodigo = async (e) => {
    e.preventDefault();
    setError("");
    setCargando(true);
    try {
      await api.olvidePassword(correo);
      setPaso("codigo");
    } catch (err) {
      setError(err.message);
    } finally {
      setCargando(false);
    }
  };

  const handleRestablecer = async (e) => {
    e.preventDefault();
    setError("");
    if (password !== confirmar) {
      setError("Las contraseñas no coinciden.");
      return;
    }
    setCargando(true);
    try {
      await api.restablecerPassword(correo, codigo, password);
      setPaso("listo");
    } catch (err) {
      setError(err.message);
    } finally {
      setCargando(false);
    }
  };

  return (
    <div className="min-h-dvh w-full flex items-center justify-center bg-surface-container-lowest p-6">
      <div className="w-full max-w-md">
        <Link to="/login" className="inline-flex items-center gap-1.5 mb-5 text-on-surface-variant hover:text-primary transition-colors font-label-md text-label-md">
          <span className="material-symbols-outlined text-[18px]">arrow_back</span>
          <span>Volver a iniciar sesión</span>
        </Link>

        <MarcaAuth className="mb-6" />

        <div className="bg-surface border border-surface-container-high rounded-3xl p-6 shadow-[0_10px_35px_-8px_rgba(0,0,0,0.06)]">
          {paso === "correo" && (
            <>
              <span className="block font-label-xs text-label-xs font-bold uppercase tracking-wider text-secondary mb-1.5">
                Recuperar acceso
              </span>
              <h1 className="font-headline-md text-headline-md text-on-surface tracking-tight mb-1.5">
                ¿Olvidaste tu contraseña?
              </h1>
              <p className="font-body-sm text-body-sm text-on-surface-variant leading-relaxed mb-5">
                Ingresa tu correo y te enviamos un código real de 6 dígitos para crear una contraseña nueva.
              </p>

              <form className="space-y-4" onSubmit={handleSolicitarCodigo}>
                <CampoAuth id="email" etiqueta="Correo electrónico" icono="mail">
                  <input
                    id="email"
                    autoComplete="email"
                    className="w-full pl-11 pr-4 py-3 bg-surface-container-low border border-surface-container-high rounded-xl text-on-surface font-body-md text-body-md placeholder:text-outline focus:bg-surface-container-lowest focus:border-secondary transition-all outline-none"
                    placeholder="correo@dominio.com"
                    type="email"
                    required
                    value={correo}
                    onChange={(e) => setCorreo(e.target.value)}
                  />
                </CampoAuth>

                {error && <p className="text-error font-body-sm text-body-sm">{error}</p>}

                <BotonAuth cargando={cargando} texto="Enviar código" textoCargando="Enviando..." />
              </form>
            </>
          )}

          {paso === "codigo" && (
            <>
              <span className="block font-label-xs text-label-xs font-bold uppercase tracking-wider text-secondary mb-1.5">
                Revisa tu correo
              </span>
              <h1 className="font-headline-md text-headline-md text-on-surface tracking-tight mb-1.5">
                Ingresa el código y tu nueva contraseña
              </h1>
              <p className="font-body-sm text-body-sm text-on-surface-variant leading-relaxed mb-5">
                Enviamos un código de 6 dígitos a <strong className="text-on-surface">{correo}</strong>. Expira en 15 minutos.
              </p>

              <form className="space-y-4" onSubmit={handleRestablecer}>
                <CampoAuth id="codigo" etiqueta="Código de verificación" icono="pin">
                  <input
                    id="codigo"
                    inputMode="numeric"
                    maxLength={6}
                    className="w-full pl-11 pr-4 py-3 bg-surface-container-low border border-surface-container-high rounded-xl text-on-surface font-title-lg text-title-lg tracking-[0.4em] placeholder:tracking-normal placeholder:text-outline focus:bg-surface-container-lowest focus:border-secondary transition-all outline-none"
                    placeholder="000000"
                    required
                    value={codigo}
                    onChange={(e) => setCodigo(e.target.value.replace(/\D/g, "").slice(0, 6))}
                  />
                </CampoAuth>

                <CampoAuth id="password" etiqueta="Contraseña nueva" icono="lock">
                  <input
                    id="password"
                    autoComplete="new-password"
                    className="w-full pl-11 pr-11 py-3 bg-surface-container-low border border-surface-container-high rounded-xl text-on-surface font-body-md text-body-md placeholder:text-outline focus:bg-surface-container-lowest focus:border-secondary transition-all outline-none tracking-widest"
                    placeholder="Mínimo 8 caracteres"
                    type={mostrarPassword ? "text" : "password"}
                    required
                    minLength={8}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                  />
                  <button
                    type="button"
                    aria-label="Mostrar u ocultar contraseña"
                    className="absolute right-3.5 text-outline hover:text-on-surface transition-colors"
                    onClick={() => setMostrarPassword((v) => !v)}
                  >
                    <span className="material-symbols-outlined text-[20px]">{mostrarPassword ? "visibility_off" : "visibility"}</span>
                  </button>
                </CampoAuth>

                <CampoAuth id="confirmar" etiqueta="Confirmar contraseña" icono="lock_reset">
                  <input
                    id="confirmar"
                    autoComplete="new-password"
                    className="w-full pl-11 pr-4 py-3 bg-surface-container-low border border-surface-container-high rounded-xl text-on-surface font-body-md text-body-md placeholder:text-outline focus:bg-surface-container-lowest focus:border-secondary transition-all outline-none tracking-widest"
                    placeholder="Repite la contraseña"
                    type={mostrarPassword ? "text" : "password"}
                    required
                    minLength={8}
                    value={confirmar}
                    onChange={(e) => setConfirmar(e.target.value)}
                  />
                </CampoAuth>

                {error && <p className="text-error font-body-sm text-body-sm">{error}</p>}

                <BotonAuth cargando={cargando} texto="Restablecer contraseña" textoCargando="Guardando..." />

                <button
                  type="button"
                  onClick={() => { setPaso("correo"); setCodigo(""); setError(""); }}
                  className="w-full text-center font-label-xs text-label-xs text-on-surface-variant hover:text-primary transition-colors"
                >
                  ¿No te llegó? Volver a intentar con otro correo
                </button>
              </form>
            </>
          )}

          {paso === "listo" && (
            <div className="flex flex-col items-center text-center gap-2 py-2">
              <span className="material-symbols-outlined text-secondary text-[40px]">check_circle</span>
              <h1 className="font-headline-md text-headline-md text-on-surface">Contraseña actualizada</h1>
              <p className="font-body-sm text-body-sm text-on-surface-variant">
                Ya puedes iniciar sesión con tu nueva contraseña.
              </p>
              <button
                onClick={() => navigate("/login")}
                className="mt-3 w-full py-2.5 rounded-xl bg-primary text-on-primary font-label-md text-label-md hover:bg-primary-container transition-colors"
              >
                Ir a iniciar sesión
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
