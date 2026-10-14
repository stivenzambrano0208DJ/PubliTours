import { useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { api } from "../api/client";
import { useConsultaViva } from "../hooks/useConsultaViva";
import { EVENTO_MENSAJES } from "../hooks/useMensajesSinLeer";
import ListaConversaciones from "../components/mensajes/ListaConversaciones";
import HiloConversacion from "../components/mensajes/HiloConversacion";

const CADA_MS = 15000;

// Bandeja de mensajes: la lista a la izquierda y la conversación abierta a la derecha. En el celular se ve una cosa a la vez.
export default function Mensajes() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { datos: conversaciones, error, cargando, recargar } = useConsultaViva("conversaciones", () => api.conversaciones(), CADA_MS);

  // Si se lee o se envía algo en el hilo, la lista (orden y contadores) se actualiza al momento.
  useEffect(() => {
    window.addEventListener(EVENTO_MENSAJES, recargar);
    return () => window.removeEventListener(EVENTO_MENSAJES, recargar);
  }, [recargar]);

  return (
    <div className="max-w-[1360px] mx-auto px-gutter py-space-lg flex flex-col gap-space-md">
      <header>
        <h1 className="font-headline-xl text-headline-xl text-primary tracking-tight">Mensajes</h1>
        <p className="font-body-md text-body-md text-on-surface-variant">Tus conversaciones con negocios y clientes. Los negocios solo responden a quien les escribió.</p>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-[360px_1fr] gap-space-md h-[calc(100dvh-15rem)] min-h-[28rem]">
        <section aria-label="Conversaciones" className={`bg-surface-container-lowest rounded-2xl shadow-sm overflow-y-auto ${id ? "hidden lg:block" : "block"}`}>
          {cargando && !conversaciones && <p role="status" className="p-space-lg text-on-surface-variant">Cargando…</p>}
          {error && !conversaciones && <p role="alert" className="p-space-lg text-error">{error}</p>}
          {conversaciones && <ListaConversaciones conversaciones={conversaciones} activaId={id} />}
        </section>

        <section aria-label="Conversación abierta" className={`bg-surface-container-lowest rounded-2xl shadow-sm min-h-0 ${id ? "block" : "hidden lg:flex lg:items-center lg:justify-center"}`}>
          {id ? (
            <HiloConversacion key={id} id={id} onVolver={() => navigate("/mensajes")} />
          ) : (
            <p className="text-on-surface-variant font-body-md text-body-md">Elige una conversación para verla.</p>
          )}
        </section>
      </div>
    </div>
  );
}
