import { useState } from "react";
import { api } from "../../api/client";
import { useConsulta } from "../../hooks/useConsulta";
import { MOTIVOS_CASO, ESTADOS_CASO } from "../../utils/soporte";
import ModalMotivo from "../ModalMotivo";
import { useAvisos } from "../../context/avisos";
import Tarjeta from "../ui/Tarjeta";
import Aviso from "../ui/Aviso";

const ROL = { turista: "la turista", prestador: "el negocio" };
const fecha = (iso) => new Date(iso).toLocaleString("es-CO", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });

// Atención al cliente: los problemas que la turista o el negocio reportan sobre una reserva. La administración los pone en revisión
// (puede dejar una nota) y los resuelve con una respuesta que le llega a quien abrió el caso. Se atienden en orden de llegada.
export default function CasosAdmin() {
  const { avisar } = useAvisos();
  const [estado, setEstado] = useState("abierto");
  const [version, setVersion] = useState(0);
  const { datos: casos, error, cargando } = useConsulta(`casos-${estado}-${version}`, () => api.casosAdmin(estado));
  const [accion, setAccion] = useState(null); // { caso, estado }

  const atender = async (respuesta) => {
    try {
      await api.atenderCasoAdmin(accion.caso.id, { estado: accion.estado, respuesta: respuesta || undefined });
      setAccion(null);
      setVersion((v) => v + 1);
    } catch (err) {
      avisar(err.message);
    }
  };

  return (
    <Tarjeta as="section" className="p-5">
      <h2 className="font-title-lg text-title-lg text-on-surface font-semibold">Casos de soporte</h2>
      <p className="font-body-sm text-body-sm text-on-surface-variant mb-4">Problemas que una turista o un negocio reportaron sobre una reserva. Quien abrió el caso recibe tu respuesta.</p>

      <div role="group" aria-label="Estado del caso" className="flex flex-wrap gap-2 mb-4">
        {Object.entries(ESTADOS_CASO).map(([clave, { texto }]) => (
          <button
            key={clave} type="button" aria-pressed={estado === clave} onClick={() => setEstado(clave)}
            className={`px-3 py-1.5 rounded-full font-label-xs text-label-xs font-semibold transition-colors ${estado === clave ? "bg-primary text-on-primary" : "bg-surface-container text-on-surface-variant hover:bg-surface-container-high"}`}
          >
            {texto}
          </button>
        ))}
      </div>

      {cargando ? (
        <p role="status" className="font-body-sm text-body-sm text-on-surface-variant">Cargando…</p>
      ) : error ? (
        <Aviso>{error}</Aviso>
      ) : casos.length === 0 ? (
        <p className="font-body-sm text-body-sm text-on-surface-variant">{estado === "abierto" ? "No hay casos nuevos por atender." : "No hay casos en este estado."}</p>
      ) : (
        <div className="flex flex-col gap-3">
          {casos.map((c) => (
            <article key={c.id} className="p-4 rounded-xl bg-surface-container-low flex flex-col gap-2">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="font-title-sm text-title-sm text-on-surface font-semibold">{MOTIVOS_CASO[c.motivo] || c.motivo}</span>
                <span className="font-label-xs text-label-xs text-outline">{fecha(c.creado_en)}</span>
              </div>
              <p className="font-label-xs text-label-xs text-on-surface-variant">
                {c.servicio} · {c.fecha_servicio} · reserva {c.codigo} ({c.estado_reserva}) · turista: {c.turista || "—"} · negocio: {c.negocio || "—"}
              </p>
              <p className="font-label-xs text-label-xs text-secondary font-semibold">Lo abrió {ROL[c.abierto_por?.rol] || "una persona"}: {c.abierto_por?.nombre}</p>
              <p className="font-body-sm text-body-sm text-on-surface whitespace-pre-line">{c.detalle}</p>
              {c.respuesta && (
                <div className="pl-3 border-l-2 border-secondary">
                  <p className="font-label-xs text-label-xs text-secondary font-semibold">{c.estado === "resuelto" ? "Respuesta enviada" : "Nota enviada"}</p>
                  <p className="font-body-sm text-body-sm text-on-surface">{c.respuesta}</p>
                </div>
              )}
              {c.estado !== "resuelto" && (
                <div className="flex flex-wrap gap-2">
                  {c.estado === "abierto" && (
                    <button type="button" onClick={() => setAccion({ caso: c, estado: "en_revision" })} className="px-3 py-2 rounded-xl bg-surface-container hover:bg-surface-container-high text-on-surface font-label-xs text-label-xs font-semibold">
                      Poner en revisión
                    </button>
                  )}
                  <button type="button" onClick={() => setAccion({ caso: c, estado: "resuelto" })} className="px-3 py-2 rounded-xl bg-primary text-on-primary hover:bg-secondary font-label-xs text-label-xs font-semibold">
                    Resolver
                  </button>
                </div>
              )}
            </article>
          ))}
        </div>
      )}

      {accion && (
        <ModalMotivo
          titulo={accion.estado === "resuelto" ? "Resolver caso" : "Poner en revisión"}
          descripcion={accion.estado === "resuelto"
            ? "Escribe la respuesta: le llega a quien abrió el caso y el caso queda cerrado."
            : "Opcional: una nota para quien abrió el caso (por ejemplo, que ya contactaste al negocio)."}
          etiqueta={accion.estado === "resuelto" ? "Respuesta" : "Nota (opcional)"}
          placeholder={accion.estado === "resuelto" ? "Ej. Hablamos con el negocio y reprogramó la visita sin costo." : "Ej. Ya estamos hablando con el negocio."}
          textoConfirmar={accion.estado === "resuelto" ? "Resolver caso" : "Poner en revisión"}
          obligatorio={accion.estado === "resuelto"}
          onConfirmar={atender}
          onCerrar={() => setAccion(null)}
        />
      )}
    </Tarjeta>
  );
}
