import { Link } from "react-router-dom";
import { urlFotoMensaje } from "../../api/client";
import { horaCorta } from "../../utils/tiempo";

const ETIQUETA_CONTEXTO = { sitio: "Servicio", paquete: "Paquete", reserva: "Reserva" };

// A dónde lleva el tema de un mensaje: la página pública del servicio o del paquete, o la lista de reservas de quien lo lee.
const destinoDe = (contexto, lado) =>
  contexto.tipo === "sitio" ? `/sitios/${contexto.id}` : contexto.tipo === "paquete" ? `/paquetes/${contexto.id}` : lado === "negocio" ? "/mi-negocio" : "/mis-reservas";

// Un mensaje de la conversación. El texto se muestra como texto (nunca como página) y respeta los saltos de línea.
export default function BurbujaMensaje({ mensaje, lado, onVerFoto, onReportar }) {
  if (mensaje.retirado) {
    return (
      <p className={`max-w-[85%] sm:max-w-[70%] px-3 py-2 rounded-2xl bg-surface-container text-on-surface-variant italic font-body-sm text-body-sm ${mensaje.mio ? "self-end" : "self-start"}`}>
        Mensaje retirado por la administración.
      </p>
    );
  }
  const { mio, contexto, texto, imagenes } = mensaje;

  return (
    <div className={`max-w-[85%] sm:max-w-[70%] flex flex-col gap-1 ${mio ? "self-end items-end" : "self-start items-start"}`}>
      <div className={`px-3.5 py-2.5 rounded-2xl flex flex-col gap-2 ${mio ? "bg-primary text-on-primary rounded-br-md" : "bg-surface-container-low text-on-surface rounded-bl-md"}`}>
        {contexto && (
          <Link
            to={destinoDe(contexto, lado)}
            className={`inline-flex items-center gap-1 self-start px-2 py-0.5 rounded-full font-label-xs text-label-xs font-semibold ${mio ? "bg-white/20 text-on-primary" : "bg-secondary-container/40 text-secondary"}`}
          >
            <span className="material-symbols-outlined text-[14px]" aria-hidden="true">sell</span>
            {ETIQUETA_CONTEXTO[contexto.tipo]}: {contexto.nombre || "ya no disponible"}
          </Link>
        )}
        {imagenes.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {imagenes.map((img) => (
              <button key={img.id} type="button" onClick={() => onVerFoto(img.id)} aria-label="Ver foto en grande" className="rounded-xl overflow-hidden">
                <img src={urlFotoMensaje(img.id)} alt="Foto enviada en la conversación" loading="lazy" className="max-h-44 max-w-[12rem] object-cover bg-surface-container" />
              </button>
            ))}
          </div>
        )}
        {texto && <p className="whitespace-pre-wrap break-words font-body-md text-body-md">{texto}</p>}
      </div>
      <div className="flex items-center gap-2 px-1 font-label-xs text-label-xs text-on-surface-variant">
        <time dateTime={mensaje.creado_en}>{horaCorta(mensaje.creado_en)}</time>
        {!mio && (
          <button type="button" onClick={() => onReportar(mensaje)} aria-label="Reportar este mensaje" className="inline-flex items-center gap-0.5 hover:text-error transition-colors">
            <span className="material-symbols-outlined text-[14px]" aria-hidden="true">flag</span>Reportar
          </button>
        )}
      </div>
    </div>
  );
}
