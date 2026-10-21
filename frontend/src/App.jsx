import { lazy, Suspense } from "react";
import { Routes, Route } from "react-router-dom";
import Layout from "./components/Layout";
import ProtectedRoute from "./components/ProtectedRoute";
import Home from "./pages/Home";
const Buscar = lazy(() => import("./pages/Buscar"));
import Login from "./pages/Login";
import Registro from "./pages/Registro";
const OlvideContrasena = lazy(() => import("./pages/OlvideContrasena"));
const Itinerario = lazy(() => import("./pages/Itinerario"));
const Mensajes = lazy(() => import("./pages/Mensajes"));
const MisReservas = lazy(() => import("./pages/MisReservas"));
const PerfilTurista = lazy(() => import("./pages/PerfilTurista"));
const ConviertetePrestador = lazy(() => import("./pages/ConviertetePrestador"));
const SitioDetalle = lazy(() => import("./pages/SitioDetalle"));
const Paquetes = lazy(() => import("./pages/Paquetes"));
const PaqueteDetalle = lazy(() => import("./pages/PaqueteDetalle"));
const Negocio = lazy(() => import("./pages/Negocio"));
const Terminos = lazy(() => import("./pages/Terminos"));
const Privacidad = lazy(() => import("./pages/Privacidad"));
const Comprobante = lazy(() => import("./pages/Comprobante"));
const VerificarReserva = lazy(() => import("./pages/VerificarReserva"));
const PanelPrestador = lazy(() => import("./pages/PanelPrestador"));
const PanelAdmin = lazy(() => import("./pages/PanelAdmin"));
const Ayuda = lazy(() => import("./pages/Ayuda"));
const PlanCompartido = lazy(() => import("./pages/PlanCompartido"));
import NotFound from "./pages/NotFound";
import { AuthProvider } from "./context/AuthContext";
import { AvisosProvider } from "./context/AvisosContext";
import { FavoritosProvider } from "./context/FavoritosContext";

export default function App() {
  return (
    <AvisosProvider>
    <AuthProvider>
      <FavoritosProvider>
      <Suspense fallback={<p role="status" className="p-8 text-center text-on-surface-variant">Cargando…</p>}>
      <Routes>
        {/* Sin Layout (sin header/footer del sitio): pantallas de autenticación a pantalla completa */}
        <Route path="/login" element={<Login />} />
        <Route path="/registro" element={<Registro />} />
        <Route path="/olvide-password" element={<OlvideContrasena />} />

        <Route element={<Layout />}>
          <Route path="/" element={<Home />} />
          <Route path="/explorar" element={<Buscar />} />
          <Route path="/conviertete-en-prestador" element={<ConviertetePrestador />} />
          <Route path="/sitios/:id" element={<SitioDetalle />} />
          <Route path="/paquetes" element={<Paquetes />} />
          <Route path="/paquetes/:id" element={<PaqueteDetalle />} />
          <Route path="/negocios/:id" element={<Negocio />} />
          <Route path="/terminos" element={<Terminos />} />
          <Route path="/verificar/:codigo" element={<VerificarReserva />} />
          <Route path="/comprobante/:id" element={<Comprobante />} />
          <Route path="/privacidad" element={<Privacidad />} />
          <Route path="/ayuda" element={<Ayuda />} />
          <Route path="/plan/:token" element={<PlanCompartido />} />

          <Route path="/itinerario" element={
            <ProtectedRoute roles={["turista", "prestador"]}><Itinerario /></ProtectedRoute>
          } />
          <Route path="/mensajes" element={
            <ProtectedRoute roles={["turista", "prestador"]}><Mensajes /></ProtectedRoute>
          } />
          <Route path="/mensajes/:id" element={
            <ProtectedRoute roles={["turista", "prestador"]}><Mensajes /></ProtectedRoute>
          } />
          <Route path="/mis-reservas" element={
            <ProtectedRoute roles={["turista", "prestador"]}><MisReservas /></ProtectedRoute>
          } />
          <Route path="/perfil" element={
            <ProtectedRoute roles={["turista", "prestador"]}><PerfilTurista /></ProtectedRoute>
          } />
          <Route path="/mi-negocio" element={
            <ProtectedRoute roles={["prestador"]}><PanelPrestador /></ProtectedRoute>
          } />
          <Route path="/admin" element={
            <ProtectedRoute roles={["administrador"]}><PanelAdmin /></ProtectedRoute>
          } />
          <Route path="*" element={<NotFound />} />
        </Route>
      </Routes>
      </Suspense>
      </FavoritosProvider>
    </AuthProvider>
    </AvisosProvider>
  );
}
