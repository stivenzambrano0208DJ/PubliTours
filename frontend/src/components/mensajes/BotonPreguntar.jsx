import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { api } from "../../api/client";
import { useAuth } from "../../context/auth";
import { avisarCambioMensajes } from "../../hooks/useMensajesSinLeer";
import RedactorMensaje from "./RedactorMensaje";

// Ventana para escribirle al negocio sobre un servicio, un paquete o una reserva. Al enviar lleva a la conversación.
function ModalPreguntar({ tema, titulo, ayuda, onCerrar }) {
  const navigate = useNavigate();
  const alEnviar = async (texto, fotos) => {
    const { conversacion_id: id } = await api.iniciarConversacion({ ...tema, texto }, fotos);
    avisarCambioMensajes();
    onCerrar();
    navigate(`/mensajes/${id}`);
  };

  return (
    <div className="fixed inset-0 bg-black/40 z-[60] flex items-end sm:items-center justify-center p-0 sm:p-4" onClick={onCerrar}>
      <div role="dialog" aria-modal="true" aria-labelledby="titulo-preguntar" onClick={(e) => e.stopPropagation()} className="w-full sm:max-w-lg bg-surface-container-lowest rounded-t-3xl sm:rounded-2xl p-6 shadow-xl flex flex-col gap-3">
        <div className="flex items-start justify-between gap-3">
          <h3 id="titulo-preguntar" className="font-headline-md text-headline-md text-primary">{titulo}</h3>
          <button type="button" onClick={onCerrar} aria-label="Cerrar" className="w-9 h-9 rounded-full hover:bg-surface-container flex items-center justify-center shrink-0">
            <span className="material-symbols-outlined" aria-hidden="true">close</span>
          </button>
        </div>
        <p className="font-body-sm text-body-sm text-on-surface-variant">{ayuda}</p>
        <RedactorMensaje onEnviar={alEnviar} placeholder="Escribe tu pregunta…" textoBoton="Enviar" autoFocus />
      </div>
    </div>
  );
}

// Botón "Preguntar al negocio". Sin sesión invita a iniciarla; para la administración no se muestra (no participa en conversaciones).
// Uso: <BotonPreguntar tema={{ sitio_id: 3 }} nombre="Cascada La Diabla" />  ·  tema = { sitio_id } | { paquete_id } | { reserva_id }
export default function BotonPreguntar({ tema, nombre, etiqueta = "Preguntar al negocio", className = "" }) {
  const { usuario } = useAuth();
  const [abierto, setAbierto] = useState(false);
  if (usuario?.rol === "administrador") return null;

  const base = `inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl font-label-md text-label-md font-semibold transition-colors ${className}`;
  if (!usuario) {
    return (
      <Link to="/login" className={`${base} bg-surface-container text-on-surface hover:bg-surface-container-high`}>
        <span className="material-symbols-outlined text-[18px]" aria-hidden="true">chat</span>Inicia sesión para preguntar
      </Link>
    );
  }
  return (
    <>
      <button type="button" onClick={() => setAbierto(true)} className={`${base} bg-surface-container text-on-surface hover:bg-surface-container-high`}>
        <span className="material-symbols-outlined text-[18px]" aria-hidden="true">chat</span>{etiqueta}
      </button>
      {abierto && (
        <ModalPreguntar
          tema={tema} titulo={etiqueta}
          ayuda={`Tu mensaje le llega al negocio${nombre ? ` sobre «${nombre}»` : ""}. Puedes adjuntar fotos. Nunca compartas contraseñas ni datos de tu tarjeta por mensaje.`}
          onCerrar={() => setAbierto(false)}
        />
      )}
    </>
  );
}
