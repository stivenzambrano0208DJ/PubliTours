import { useEffect, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/auth";
import NotificacionesCampana from "./NotificacionesCampana";
import IndicadorMensajes from "./mensajes/IndicadorMensajes";

const NAV_BASE = [
  { to: "/", label: "Inicio" },
  { to: "/explorar", label: "Explorar Destinos" },
  { to: "/paquetes", label: "Paquetes" },
];

export default function Header() {
  const { usuario, logout } = useAuth();
  const navigate = useNavigate();
  const [menuAbierto, setMenuAbierto] = useState(false);
  const [perfilAbierto, setPerfilAbierto] = useState(false);
  const perfilRef = useRef(null);

  // El menú de usuario se abre con clic y se cierra al hacer clic fuera, con Escape o al elegir una opción.
  useEffect(() => {
    if (!perfilAbierto) return;
    const fuera = (e) => { if (perfilRef.current && !perfilRef.current.contains(e.target)) setPerfilAbierto(false); };
    const escape = (e) => { if (e.key === "Escape") setPerfilAbierto(false); };
    document.addEventListener("mousedown", fuera);
    document.addEventListener("keydown", escape);
    return () => { document.removeEventListener("mousedown", fuera); document.removeEventListener("keydown", escape); };
  }, [perfilAbierto]);

  const handleLogout = () => {
    setPerfilAbierto(false);
    logout();
    setMenuAbierto(false);
    navigate("/");
  };

  const cerrarMenu = () => setMenuAbierto(false);

  const navLinks = [
    ...NAV_BASE,
    ...((!usuario || usuario.rol === "turista")
      ? [{ to: "/conviertete-en-prestador", label: "Conviértete en Prestador" }]
      : []),
    ...((usuario?.rol === "turista" || usuario?.rol === "prestador")
      ? [
          { to: "/itinerario", label: "Itinerario IA", icono: "auto_awesome" },
          { to: "/mis-reservas", label: "Mis Reservas" },
        ]
      : []),
    ...(usuario?.rol === "prestador" ? [{ to: "/mi-negocio", label: "Portal Prestador" }] : []),
    ...(usuario?.rol === "administrador" ? [{ to: "/admin", label: "Panel Admin" }] : []),
  ];

  return (
    <header className="print:hidden fixed top-0 left-0 w-full z-50 bg-surface-container-lowest/80 backdrop-blur-xl shadow-[0_4px_20px_-2px_rgba(6,78,59,0.04)]">
      <div className="h-20 max-w-[1360px] mx-auto px-gutter flex items-center justify-between gap-space-sm">
        <div className="flex items-center gap-space-md shrink-0">
          <Link to="/" className="flex items-center gap-space-sm" onClick={cerrarMenu}>
            <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-primary-container to-secondary flex items-center justify-center shrink-0">
              <span className="material-symbols-outlined text-on-primary text-[18px]">forest</span>
            </div>
            <span className="font-title-lg text-title-lg tracking-tight text-primary whitespace-nowrap">
              PubliTours{" "}
              <span className="text-secondary font-body-sm text-body-sm font-semibold tracking-normal px-2 py-0.5 rounded-full bg-secondary-container/30">
                Vive IA
              </span>
            </span>
          </Link>
        </div>

        <nav className="hidden xl:flex items-center gap-0.5 min-w-0">
          {navLinks.map((l) => (
            <Link
              key={l.to}
              to={l.to}
              className="flex items-center gap-1.5 px-2.5 h-9 whitespace-nowrap rounded-lg text-on-surface-variant hover:text-on-surface hover:bg-surface-container transition-colors font-label-md text-label-md"
            >
              {l.icono && <span className="material-symbols-outlined text-[16px] text-secondary">{l.icono}</span>}
              {l.label}
            </Link>
          ))}
        </nav>

        <div className="flex items-center gap-space-sm shrink-0">
          {(!usuario || usuario.rol === "turista" || usuario.rol === "prestador") && (
            <Link
              to="/itinerario"
              className="relative hidden sm:inline-flex items-center gap-space-xs px-4 py-2 whitespace-nowrap rounded-xl bg-gradient-to-r from-primary-container to-secondary text-on-primary font-label-md text-label-md shadow-[0_4px_20px_-2px_rgba(6,78,59,0.2)] hover:opacity-95 transition-all"
            >
              <span className="material-symbols-outlined text-[18px] text-tertiary-fixed">auto_awesome</span>
              <span>Crear con IA</span>
            </Link>
          )}

          {(usuario?.rol === "turista" || usuario?.rol === "prestador") && <IndicadorMensajes />}
          {usuario && <NotificacionesCampana />}

          {usuario ? (
            <div ref={perfilRef} className="hidden xl:flex relative items-center pl-space-xs">
              <button
                type="button"
                onClick={() => setPerfilAbierto((v) => !v)}
                aria-haspopup="menu"
                aria-expanded={perfilAbierto}
                className="flex items-center gap-space-sm rounded-xl px-2 py-1 hover:bg-surface-container transition-colors"
              >
                <span className="w-8 h-8 rounded-full bg-primary-container text-on-primary flex items-center justify-center font-title-sm text-title-sm">
                  {usuario.nombre.charAt(0).toUpperCase()}
                </span>
                <span className="hidden md:flex flex-col text-left min-w-0 max-w-[150px]">
                  <span className="font-label-md text-label-md text-on-surface leading-tight truncate">{usuario.nombre}</span>
                  <span className="font-label-xs text-label-xs text-on-surface-variant capitalize truncate">{usuario.rol}</span>
                </span>
                <span className={`material-symbols-outlined text-on-surface-variant text-[18px] transition-transform ${perfilAbierto ? "rotate-180" : ""}`}>expand_more</span>
              </button>
              <div
                role="menu"
                className={`absolute right-0 top-full mt-2 w-56 py-space-sm px-space-xs rounded-xl bg-surface-container-lowest shadow-[0_20px_30px_-6px_rgba(6,78,59,0.08)] transition-all flex flex-col gap-1 z-50 ${perfilAbierto ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"}`}
              >
                <div className="px-3 py-2">
                  <p className="font-title-sm text-title-sm text-on-surface">Hola, {usuario.nombre}</p>
                  <p className="font-label-xs text-label-xs text-on-surface-variant">{usuario.correo}</p>
                </div>
                <div className="h-px bg-surface-container-high my-1" />
                <Link
                  to={usuario.rol === "administrador" ? "/admin" : "/perfil"}
                  onClick={() => setPerfilAbierto(false)}
                  className="flex items-center gap-2 px-3 py-2 rounded-lg text-on-surface-variant hover:text-on-surface hover:bg-surface-container font-label-md text-label-md text-left"
                >
                  <span className="material-symbols-outlined text-[18px]">
                    {usuario.rol === "administrador" ? "admin_panel_settings" : "person"}
                  </span>
                  {usuario.rol === "administrador" ? "Panel Admin" : "Mi Perfil"}
                </Link>
                <div className="h-px bg-surface-container-high my-1" />
                <button
                  onClick={handleLogout}
                  className="flex items-center gap-2 px-3 py-2 rounded-lg text-on-surface-variant hover:text-on-surface hover:bg-surface-container font-label-md text-label-md text-left"
                >
                  <span className="material-symbols-outlined text-[18px]">logout</span>
                  Cerrar sesión
                </button>
              </div>
            </div>
          ) : (
            <div className="hidden xl:flex items-center gap-space-sm">
              <Link to="/login" className="px-3 py-2 rounded-lg text-on-surface-variant hover:text-on-surface hover:bg-surface-container transition-colors font-label-md text-label-md">
                Iniciar sesión
              </Link>
              <Link to="/registro" className="px-4 py-2 rounded-xl bg-primary text-on-primary font-label-md text-label-md hover:bg-primary-container transition-colors">
                Registrarme
              </Link>
            </div>
          )}

          {/* Botón hamburguesa: visible por debajo de xl */}
          <button
            aria-label="Abrir menú"
            onClick={() => setMenuAbierto((v) => !v)}
            className="xl:hidden p-2 rounded-lg text-on-surface hover:bg-surface-container transition-colors"
          >
            <span className="material-symbols-outlined text-[26px]">{menuAbierto ? "close" : "menu"}</span>
          </button>
        </div>
      </div>

      {/* Panel de menú móvil */}
      {menuAbierto && (
        <div className="xl:hidden bg-surface-container-lowest border-t border-surface-container shadow-[0_20px_30px_-6px_rgba(6,78,59,0.08)] max-h-[calc(100vh-5rem)] overflow-y-auto">
          <div className="px-gutter py-space-md flex flex-col gap-1">
            {navLinks.map((l) => (
              <Link
                key={l.to}
                to={l.to}
                onClick={cerrarMenu}
                className="flex items-center gap-2 px-3 py-3 rounded-lg text-on-surface hover:bg-surface-container transition-colors font-label-md text-label-md"
              >
                {l.icono && <span className="material-symbols-outlined text-[18px] text-secondary">{l.icono}</span>}
                {l.label}
              </Link>
            ))}

            <div className="h-px bg-surface-container-high my-2" />

            {usuario ? (
              <>
                <div className="px-3 py-2">
                  <p className="font-title-sm text-title-sm text-on-surface">Hola, {usuario.nombre}</p>
                  <p className="font-label-xs text-label-xs text-on-surface-variant">{usuario.correo}</p>
                </div>
                <Link
                  to={usuario.rol === "administrador" ? "/admin" : "/perfil"}
                  onClick={cerrarMenu}
                  className="flex items-center gap-2 px-3 py-3 rounded-lg text-on-surface hover:bg-surface-container font-label-md text-label-md"
                >
                  <span className="material-symbols-outlined text-[18px]">
                    {usuario.rol === "administrador" ? "admin_panel_settings" : "person"}
                  </span>
                  {usuario.rol === "administrador" ? "Panel Admin" : "Mi Perfil"}
                </Link>
                <button
                  onClick={handleLogout}
                  className="flex items-center gap-2 px-3 py-3 rounded-lg text-on-surface hover:bg-surface-container font-label-md text-label-md text-left"
                >
                  <span className="material-symbols-outlined text-[18px]">logout</span>
                  Cerrar sesión
                </button>
              </>
            ) : (
              <div className="flex flex-col gap-2">
                <Link
                  to="/login"
                  onClick={cerrarMenu}
                  className="px-3 py-3 rounded-lg text-on-surface hover:bg-surface-container transition-colors font-label-md text-label-md text-center"
                >
                  Iniciar sesión
                </Link>
                <Link
                  to="/registro"
                  onClick={cerrarMenu}
                  className="px-4 py-3 rounded-xl bg-primary text-on-primary font-label-md text-label-md hover:bg-primary-container transition-colors text-center"
                >
                  Registrarme
                </Link>
              </div>
            )}
          </div>
        </div>
      )}
    </header>
  );
}
