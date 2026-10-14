import { useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { api } from "../api/client";
import { useAuth } from "../context/auth";
import CamposNegocio from "../components/CamposNegocio";
import LayoutAuth from "../components/auth/LayoutAuth";
import MarcaAuth from "../components/auth/MarcaAuth";
import BotonAuth from "../components/auth/BotonAuth";

const NEGOCIO_VACIO = { nombre_negocio: "", categoria: "", municipio: "" };

// Imagen y mensaje del panel lateral (solo en pantallas grandes).
const HERO = {
  imagen: "https://lh3.googleusercontent.com/aida-public/AB6AXuBkGr2bWtTZzvslrq7Wa9uv71bO_ElwXLal1lIBWmY8B04Bex_Rgo0V_PnAlsFUhPyj8kaHBw28X9NgESMzzhjXZqJXDqvBxWMvh5WWDFPNVP8LTqB66hDgAYrFpBPIXBuxnP_pz175kfz6AmKTAle2LT5qBpfaLVifZ6Cxf7cb-sBSpllNSX09oTre-AVo3Ub1r115inPKvchTgrj1TAbS_hQS29mR9KCYYk0GKO8lb_S16aMDZl5xIQ",
  titulo: ["Únete a la", "comunidad del Caquetá."],
  descripcion: "Crea tu cuenta para planificar tu viaje con IA, o publica tu negocio y gana visibilidad ante turistas reales.",
  etiquetas: [
    { icono: "hiking", texto: "Para turistas" },
    { icono: "storefront", texto: "Para prestadores" },
    { icono: "verified", texto: "Verificación real" },
  ],
};

export default function Registro() {
  const [searchParams] = useSearchParams();
  const rolInicial = searchParams.get("rol") === "prestador" ? "prestador" : "turista";
  const [form, setForm] = useState({ nombre: "", correo: "", password: "", rol: rolInicial });
  const [negocio, setNegocio] = useState(NEGOCIO_VACIO);
  const [aceptaTerminos, setAceptaTerminos] = useState(false);
  const [mostrarPassword, setMostrarPassword] = useState(false);
  const [error, setError] = useState("");
  const [cargando, setCargando] = useState(false);
  const navigate = useNavigate();
  const { login } = useAuth();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setCargando(true);
    try {
      const esPrestador = form.rol === "prestador";
      const data = await api.registro({ ...(esPrestador ? { ...form, negocio } : form), acepta_terminos: aceptaTerminos });
      login(data.usuario);
      navigate(esPrestador ? "/mi-negocio" : "/"); // el prestador ve el estado de verificación de su negocio
    } catch (err) {
      setError(err.message);
    } finally {
      setCargando(false);
    }
  };

  return (
    <LayoutAuth hero={HERO}>
      <MarcaAuth className="mb-5" />

      <span className="block font-label-xs text-label-xs font-bold uppercase tracking-wider text-secondary mb-1.5">
        Crear cuenta
      </span>
      <h1 className="font-headline-md text-headline-md text-on-surface tracking-tight mb-1.5">
        Empieza tu experiencia
      </h1>
      <p className="font-body-sm text-body-sm text-on-surface-variant leading-relaxed mb-4">
        {form.rol === "prestador"
          ? "Crea tu cuenta y registra tu negocio: te pediremos algunos datos más."
          : "Regístrate como turista o como prestador de servicios turísticos."}
      </p>

      <div className="bg-surface border border-surface-container-high rounded-3xl p-5 sm:p-6 shadow-[0_10px_35px_-8px_rgba(0,0,0,0.06)] mb-4">
        <form className="space-y-3.5" onSubmit={handleSubmit}>
          <div>
            <label className="block font-label-md text-label-md text-on-surface mb-1.5" htmlFor="nombre">
              Nombre completo
            </label>
            <div className="relative flex items-center">
              <span className="material-symbols-outlined absolute left-3.5 text-outline text-[20px] pointer-events-none">person</span>
              <input
                id="nombre"
                autoComplete="name"
                className="w-full pl-11 pr-4 py-2.5 bg-surface-container-low border border-surface-container-high rounded-xl text-on-surface font-body-md text-body-md placeholder:text-outline focus:bg-surface-container-lowest focus:border-secondary transition-all outline-none"
                placeholder="Tu nombre completo"
                type="text"
                required
                value={form.nombre}
                onChange={(e) => setForm({ ...form, nombre: e.target.value })}
              />
            </div>
          </div>

          <div>
            <p className="font-label-md text-label-md text-on-surface mb-1.5">¿Cómo quieres usar PubliTours?</p>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setForm({ ...form, rol: "turista" })}
                className={`flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-xl border transition-all font-label-md text-label-md font-semibold ${
                  form.rol === "turista"
                    ? "bg-secondary-container/30 border-secondary text-primary"
                    : "bg-surface-container-low border-surface-container-high text-on-surface-variant hover:bg-surface-container"
                }`}
              >
                <span className="material-symbols-outlined text-[18px]">hiking</span>
                <span>Turista</span>
              </button>
              <button
                type="button"
                onClick={() => setForm({ ...form, rol: "prestador" })}
                className={`flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-xl border transition-all font-label-md text-label-md font-semibold ${
                  form.rol === "prestador"
                    ? "bg-secondary-container/30 border-secondary text-primary"
                    : "bg-surface-container-low border-surface-container-high text-on-surface-variant hover:bg-surface-container"
                }`}
              >
                <span className="material-symbols-outlined text-[18px]">storefront</span>
                <span>Prestador</span>
              </button>
            </div>
          </div>

          {form.rol === "prestador" && <CamposNegocio valor={negocio} onChange={setNegocio} />}

          <div>
            <label className="block font-label-md text-label-md text-on-surface mb-1.5" htmlFor="email">
              Correo electrónico
            </label>
            <div className="relative flex items-center">
              <span className="material-symbols-outlined absolute left-3.5 text-outline text-[20px] pointer-events-none">mail</span>
              <input
                id="email"
                autoComplete="email"
                className="w-full pl-11 pr-4 py-2.5 bg-surface-container-low border border-surface-container-high rounded-xl text-on-surface font-body-md text-body-md placeholder:text-outline focus:bg-surface-container-lowest focus:border-secondary transition-all outline-none"
                placeholder="correo@dominio.com"
                type="email"
                required
                value={form.correo}
                onChange={(e) => setForm({ ...form, correo: e.target.value })}
              />
            </div>
          </div>

          <div>
            <label className="block font-label-md text-label-md text-on-surface mb-1.5" htmlFor="password">
              Contraseña
            </label>
            <div className="relative flex items-center">
              <span className="material-symbols-outlined absolute left-3.5 text-outline text-[20px] pointer-events-none">lock</span>
              <input
                id="password"
                autoComplete="new-password"
                className="w-full pl-11 pr-11 py-2.5 bg-surface-container-low border border-surface-container-high rounded-xl text-on-surface font-body-md text-body-md placeholder:text-outline focus:bg-surface-container-lowest focus:border-secondary transition-all outline-none tracking-widest"
                placeholder="Mínimo 8 caracteres"
                type={mostrarPassword ? "text" : "password"}
                required
                minLength={8}
                value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
              />
              <button
                type="button"
                aria-label="Mostrar u ocultar contraseña"
                className="absolute right-3.5 text-outline hover:text-on-surface transition-colors"
                onClick={() => setMostrarPassword((v) => !v)}
              >
                <span className="material-symbols-outlined text-[20px]">
                  {mostrarPassword ? "visibility_off" : "visibility"}
                </span>
              </button>
            </div>
          </div>
          <label className="flex items-start gap-2.5 cursor-pointer">
            <input
              type="checkbox"
              required
              checked={aceptaTerminos}
              onChange={(e) => setAceptaTerminos(e.target.checked)}
              className="mt-1 w-4 h-4 accent-[var(--color-secondary)] shrink-0"
            />
            <span className="font-body-sm text-body-sm text-on-surface-variant">
              Acepto los{" "}
              <Link to="/terminos" target="_blank" className="font-semibold text-secondary hover:underline">Términos y Condiciones</Link>{" "}
              y la{" "}
              <Link to="/privacidad" target="_blank" className="font-semibold text-secondary hover:underline">Política de Privacidad</Link>.
            </span>
          </label>

          {error && <p className="text-error font-body-sm text-body-sm">{error}</p>}

          <BotonAuth cargando={cargando} textoCargando="Creando cuenta..." texto={form.rol === "prestador" ? "Registrar mi negocio" : "Registrarme"} />
        </form>
      </div>

      <p className="font-body-sm text-body-sm text-on-surface-variant text-center">
        ¿Ya tienes cuenta?{" "}
        <Link to="/login" className="font-bold text-secondary hover:text-primary transition-colors">
          Inicia sesión
        </Link>
      </p>
    </LayoutAuth>
  );
}
