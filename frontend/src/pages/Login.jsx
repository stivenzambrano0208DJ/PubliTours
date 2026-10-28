import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { api } from "../api/client";
import { useAuth } from "../context/auth";
import LayoutAuth from "../components/auth/LayoutAuth";
import MarcaAuth from "../components/auth/MarcaAuth";
import BotonAuth from "../components/auth/BotonAuth";
import CampoAuth from "../components/auth/CampoAuth";

// Imagen y mensaje del panel lateral (solo en pantallas grandes).
const HERO = {
  imagen: "https://lh3.googleusercontent.com/aida-public/AB6AXuDHERYWN5htM5Fg8MKHPnfXLznrFwzpR5SXlGwcZtEF7pEfel7NSEeRPghvftx1sb6t6WyVBCYzfPftAdcUbMISXDSi0pwJwROr4Kg6tBLHuloSPnNFCjRkiXzHF_M3zntH5uIbJJaUSyD3JSsFugRQ6JH7vCPvgPu0gE-xxWfoXaFFG1x8SWiYy45WHpNCQ_W4odfa8kJYy0D9tartIzvUA65lqeYJEGlhS-u6M0qi28ihi6fwAf7vBg",
  titulo: ["Amazonía que", "nos conecta."],
  descripcion: "Accede a la plataforma de inteligencia turística del Caquetá: itinerarios con IA, reservas directas y catálogo verificado por prestadores locales.",
  etiquetas: [
    { icono: "explore", texto: "Itinerarios con IA" },
    { icono: "verified", texto: "Catálogo verificado" },
    { icono: "forest", texto: "Prestadores locales" },
  ],
};

export default function Login() {
  const [form, setForm] = useState({ correo: "", password: "" });
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
      const data = await api.login(form);
      login(data.usuario);
      navigate("/");
    } catch (err) {
      setError(err.message);
    } finally {
      setCargando(false);
    }
  };

  return (
    <LayoutAuth hero={HERO}>
      <MarcaAuth className="mb-6" />

      <span className="block font-label-xs text-label-xs font-bold uppercase tracking-wider text-secondary mb-1.5">
        Acceso universal
      </span>
      <h1 className="font-headline-md text-headline-md text-on-surface tracking-tight mb-1.5">
        Bienvenido de nuevo
      </h1>
      <p className="font-body-sm text-body-sm text-on-surface-variant leading-relaxed mb-5">
        Ingresa con tu correo. PubliTours reconoce tu rol automáticamente.
      </p>

      <div className="bg-surface border border-surface-container-high rounded-3xl p-5 sm:p-6 shadow-[0_10px_35px_-8px_rgba(0,0,0,0.06)] mb-5">
        <form className="space-y-4" onSubmit={handleSubmit}>
          <CampoAuth id="email" etiqueta="Correo electrónico" icono="mail">
            <input
              id="email"
              autoComplete="email"
              className="w-full pl-11 pr-4 py-3 bg-surface-container-low border border-surface-container-high rounded-xl text-on-surface font-body-md text-body-md placeholder:text-outline focus:bg-surface-container-lowest focus:border-secondary transition-all outline-none"
              placeholder="correo@dominio.com"
              type="email"
              required
              value={form.correo}
              onChange={(e) => setForm({ ...form, correo: e.target.value })}
            />
          </CampoAuth>

          <CampoAuth
            id="password" etiqueta="Contraseña" icono="lock"
            derecha={
              <Link to="/olvide-password" className="font-label-xs text-label-xs text-secondary hover:text-primary transition-colors font-semibold">
                ¿Olvidaste tu contraseña?
              </Link>
            }
          >
            <input
              id="password"
              autoComplete="current-password"
              className="w-full pl-11 pr-11 py-3 bg-surface-container-low border border-surface-container-high rounded-xl text-on-surface font-body-md text-body-md placeholder:text-outline focus:bg-surface-container-lowest focus:border-secondary transition-all outline-none tracking-widest"
              placeholder="••••••••••••"
              type={mostrarPassword ? "text" : "password"}
              required
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
          </CampoAuth>

          {error && <p className="text-error font-body-sm text-body-sm">{error}</p>}

          <BotonAuth cargando={cargando} texto="Iniciar sesión" textoCargando="Ingresando..." />
        </form>
      </div>

      <div className="flex flex-col items-center gap-3 text-center">
        <button
          onClick={() => navigate("/explorar")}
          className="inline-flex items-center gap-2 px-5 py-2 rounded-full border border-surface-container-high bg-surface hover:bg-surface-container-low text-on-surface-variant font-label-xs text-label-xs font-semibold transition-colors"
        >
          <span className="material-symbols-outlined text-[16px]">visibility</span>
          <span>Explorar como invitado</span>
        </button>

        <p className="font-body-sm text-body-sm text-on-surface-variant">
          ¿Eres nuevo?{" "}
          <Link to="/registro" className="font-bold text-secondary hover:text-primary transition-colors">
            Crear cuenta
          </Link>
        </p>
      </div>
    </LayoutAuth>
  );
}
