import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "../../api/client";
import { useAuth } from "../../context/auth";
import CamposReserva from "../reservas/CamposReserva";
import PoliticaCancelacion from "./PoliticaCancelacion";
import { fechaMinima } from "../../constants";
import { pesos } from "../../utils/moneda";
import BotonPreguntar from "../mensajes/BotonPreguntar";


function Aviso({ icono, color, children }) {
  return (
    <div className="p-4 rounded-xl bg-surface-container-low text-on-surface-variant font-body-sm text-body-sm flex items-start gap-2">
      <span className={`material-symbols-outlined text-[20px] ${color} shrink-0`}>{icono}</span>
      <span>{children}</span>
    </div>
  );
}

// Lista las tarifas especiales (niños, grupos, temporadas) tal como las definió el prestador.
function Tarifas({ sitio }) {
  const hay = sitio.precio_nino != null || sitio.grupo_min_personas || sitio.tarifas?.length > 0;
  if (!hay) return null;
  const item = (icono, texto, clave) => (
    <li key={clave} className="flex items-center gap-2"><span className="material-symbols-outlined text-[18px] text-secondary">{icono}</span>{texto}</li>
  );
  return (
    <ul className="flex flex-col gap-1.5 p-3 rounded-xl bg-surface-container-low font-body-sm text-body-sm text-on-surface-variant">
      {sitio.precio_nino != null && item("child_care", `Niños: ${Number(sitio.precio_nino) === 0 ? "gratis" : pesos(sitio.precio_nino)}`, "ninos")}
      {sitio.grupo_min_personas && item("groups", `${sitio.grupo_descuento_pct} % de descuento desde ${sitio.grupo_min_personas} personas`, "grupo")}
      {(sitio.tarifas || []).map((t) => item("event", `${t.nombre} (${t.fecha_desde} a ${t.fecha_hasta}): ${pesos(t.precio)}`, t.id))}
    </ul>
  );
}

// Columna de reserva: precio, tarifas y el formulario. Según quién mira, muestra el formulario o el motivo por el que no aplica.
export default function PanelReserva({ sitio, esAdmin, esPropio }) {
  const navigate = useNavigate();
  const { usuario } = useAuth();
  const [valores, setValores] = useState({ fecha: fechaMinima(), personas: 1, ninos: 0, nota: "" });
  const [enviando, setEnviando] = useState(false);
  const [enviada, setEnviada] = useState(false);
  const [error, setError] = useState("");
  const gratis = Number(sitio.precio) === 0;

  const reservar = async (e) => {
    e.preventDefault();
    if (!usuario) { navigate("/login"); return; }
    setEnviando(true);
    setError("");
    try {
      await api.solicitarReserva({
        sitio_id: sitio.id, fecha_servicio: valores.fecha, personas: Number(valores.personas) || 1, ninos: Number(valores.ninos) || 0, nota: valores.nota,
      });
      setEnviada(true);
    } catch (err) {
      setError(err.message);
    } finally {
      setEnviando(false);
    }
  };

  let contenido;
  if (esAdmin) {
    contenido = <Aviso icono="admin_panel_settings" color="text-primary">Estás viendo este sitio en modo administrador. Gestiona la verificación del prestador desde el Panel Admin.</Aviso>;
  } else if (esPropio) {
    contenido = <Aviso icono="storefront" color="text-primary">Este es uno de tus servicios. Gestiónalo desde tu Portal Prestador.</Aviso>;
  } else if (sitio.estado !== "activo") {
    contenido = <Aviso icono="info" color="text-on-tertiary-container">Este sitio no está disponible para reservas en este momento.</Aviso>;
  } else if (enviada) {
    contenido = (
      <div className="flex flex-col items-center text-center gap-2 py-2">
        <span className="material-symbols-outlined text-secondary text-[40px]">check_circle</span>
        <h3 className="font-title-lg text-title-lg text-primary">Solicitud enviada</h3>
        <p className="font-body-sm text-body-sm text-on-surface-variant">Tu solicitud quedó pendiente de confirmación del prestador.</p>
        <button onClick={() => navigate("/mis-reservas")} className="mt-2 w-full py-2.5 rounded-xl bg-primary text-on-primary font-label-md text-label-md hover:bg-primary-container transition-colors">
          Ver mis reservas
        </button>
      </div>
    );
  } else {
    contenido = (
      <form onSubmit={reservar} className="flex flex-col gap-3">
        <CamposReserva sitio={sitio} valores={valores} onCambio={setValores} />
        <PoliticaCancelacion politica={sitio.politica_cancelacion} />
        {error && <p className="text-error font-body-sm text-body-sm">{error}</p>}
        <button
          type="submit"
          disabled={enviando}
          className="w-full py-3.5 px-4 rounded-xl bg-primary text-on-primary hover:bg-primary-container transition-all font-label-md text-label-md font-bold shadow-lg flex items-center justify-center gap-2 disabled:opacity-60"
        >
          <span className="material-symbols-outlined text-[20px]">bookmark_added</span>
          <span>{enviando ? "Enviando..." : usuario ? "Reservar" : "Inicia sesión para reservar"}</span>
        </button>
      </form>
    );
  }

  return (
    <aside className="lg:col-span-4 lg:-mt-[280px] z-10 sticky top-24">
      <div className="rounded-3xl bg-surface-container-lowest p-6 shadow-xl flex flex-col gap-5">
        <div className="flex items-baseline gap-1">
          <span className="font-headline-xl text-headline-xl text-primary font-bold">{gratis ? "Gratuito" : pesos(sitio.precio)}</span>
          {!gratis && <span className="font-body-sm text-body-sm text-on-surface-variant">COP / persona</span>}
        </div>
        <Tarifas sitio={sitio} />
        {contenido}
        {!esPropio && (
          <div className="pt-4 border-t border-surface-container-high flex flex-col gap-2">
            <p className="font-body-sm text-body-sm text-on-surface-variant">¿Tienes dudas antes de reservar?</p>
            <BotonPreguntar tema={{ sitio_id: sitio.id }} nombre={sitio.nombre} className="w-full" />
          </div>
        )}
      </div>
    </aside>
  );
}
