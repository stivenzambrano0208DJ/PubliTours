import { useCallback, useState } from "react";
import { api, urlFotoMensaje } from "../../api/client";
import { useConsulta } from "../../hooks/useConsulta";
import { MOTIVOS_REPORTE } from "../../utils/mensajes";
import VisorFoto from "../mensajes/VisorFoto";
import { useAvisos } from "../../context/avisos";
import Tarjeta from "../ui/Tarjeta";
import Aviso from "../ui/Aviso";

const ESTADOS = { pendiente: "Pendientes", descartado: "Descartados", retirado: "Retirados" };

// Moderación de mensajes: la administración ve SOLO los mensajes que alguien reportó (nunca conversaciones enteras) y decide
// si los descarta (el mensaje queda como estaba) o los retira (nadie lo vuelve a ver y su autor recibe un aviso).
export default function ReportesMensajesAdmin() {
  const { confirmar } = useAvisos();
  const [estado, setEstado] = useState("pendiente");
  const [version, setVersion] = useState(0);
  const { datos: reportes, error, cargando } = useConsulta(`${estado}-${version}`, () => api.reportesMensajesAdmin(estado));
  const [trabajando, setTrabajando] = useState(null);
  const [foto, setFoto] = useState(null);
  const [fallo, setFallo] = useState("");

  const resolver = useCallback(async (reporte, accion) => {
    if (accion === "retirar" && !(await confirmar("¿Retirar este mensaje? Nadie volverá a verlo y su autor recibirá un aviso. No se puede deshacer.", { titulo: "Retirar mensaje", confirmar: "Retirar", peligro: true }))) return;
    setTrabajando(reporte.id);
    setFallo("");
    try {
      await api.resolverReporteMensajeAdmin(reporte.id, accion);
      setVersion((v) => v + 1);
    } catch (err) {
      setFallo(err.message);
    } finally {
      setTrabajando(null);
    }
  }, [confirmar]);

  return (
    <Tarjeta as="section" className="p-5">
      <h2 className="font-title-lg text-title-lg text-on-surface font-semibold">Mensajes reportados</h2>
      <p className="font-body-sm text-body-sm text-on-surface-variant mb-4">Solo ves el mensaje reportado y sus fotos, no el resto de la conversación.</p>

      <div role="group" aria-label="Estado del reporte" className="flex flex-wrap gap-2 mb-4">
        {Object.entries(ESTADOS).map(([clave, texto]) => (
          <button
            key={clave} type="button" aria-pressed={estado === clave} onClick={() => setEstado(clave)}
            className={`px-3 py-1.5 rounded-full font-label-xs text-label-xs font-semibold transition-colors ${estado === clave ? "bg-primary text-on-primary" : "bg-surface-container text-on-surface-variant hover:bg-surface-container-high"}`}
          >
            {texto}
          </button>
        ))}
      </div>

      {fallo && <p role="alert" className="mb-3 font-label-xs text-label-xs text-error">{fallo}</p>}
      {cargando ? (
        <p role="status" className="font-body-sm text-body-sm text-on-surface-variant">Cargando…</p>
      ) : error ? (
        <Aviso>{error}</Aviso>
      ) : reportes.length === 0 ? (
        <p className="font-body-sm text-body-sm text-on-surface-variant">{estado === "pendiente" ? "No hay mensajes reportados por revisar." : "No hay reportes en este estado."}</p>
      ) : (
        <div className="flex flex-col gap-3">
          {reportes.map((r) => (
            <article key={r.id} className="p-4 rounded-xl bg-surface-container-low flex flex-col gap-2">
              <div className="flex flex-wrap items-center gap-2 font-label-xs text-label-xs">
                <span className="px-2 py-0.5 rounded-full bg-error-container text-on-error-container font-semibold">{MOTIVOS_REPORTE[r.motivo] || r.motivo}</span>
                <span className="text-on-surface-variant">Reportó {r.reportado_por || "una persona"} · {new Date(r.creado_en).toLocaleString("es-CO", { dateStyle: "medium", timeStyle: "short" })}</span>
              </div>
              {r.detalle && <p className="font-body-sm text-body-sm text-on-surface-variant">«{r.detalle}»</p>}
              <div className="p-3 rounded-lg bg-surface-container-lowest flex flex-col gap-2">
                <p className="font-label-xs text-label-xs text-secondary font-semibold">
                  Escrito por {r.mensaje.autor || "—"} · conversación entre {r.mensaje.turista || "—"} y {r.mensaje.negocio || "—"}
                </p>
                {r.mensaje.texto ? <p className="whitespace-pre-wrap break-words font-body-md text-body-md text-on-surface">{r.mensaje.texto}</p> : !r.mensaje.imagenes.length && <p className="italic text-outline">Sin texto</p>}
                {r.mensaje.imagenes.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {r.mensaje.imagenes.map((img) => (
                      <button key={img.id} type="button" onClick={() => setFoto(img.id)} aria-label="Ver foto reportada en grande" className="rounded-lg overflow-hidden">
                        <img src={urlFotoMensaje(img.id)} alt="Foto reportada" loading="lazy" className="h-24 w-24 object-cover bg-surface-container" />
                      </button>
                    ))}
                  </div>
                )}
                {r.mensaje.retirado && <p className="font-label-xs text-label-xs text-error font-semibold">Este mensaje ya fue retirado.</p>}
              </div>
              {r.estado === "pendiente" && (
                <div className="flex gap-2">
                  <button type="button" onClick={() => resolver(r, "descartar")} disabled={trabajando === r.id} className="px-3 py-2 rounded-xl bg-surface-container text-on-surface font-label-xs text-label-xs font-semibold hover:bg-surface-container-high disabled:opacity-50">
                    Descartar reporte
                  </button>
                  <button type="button" onClick={() => resolver(r, "retirar")} disabled={trabajando === r.id} className="px-3 py-2 rounded-xl bg-surface-container text-error font-label-xs text-label-xs font-semibold hover:bg-error-container disabled:opacity-50">
                    Retirar mensaje
                  </button>
                </div>
              )}
            </article>
          ))}
        </div>
      )}
      {foto && <VisorFoto imagenId={foto} onCerrar={() => setFoto(null)} />}
    </Tarjeta>
  );
}
