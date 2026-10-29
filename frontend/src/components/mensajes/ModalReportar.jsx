import { useState } from "react";
import { api } from "../../api/client";
import { useConfiguracion } from "../../hooks/useConfiguracion";
import { MOTIVOS_REPORTE } from "../../utils/mensajes";
import Modal from "../Modal";
import { useIdioma } from "../../context/idioma";

// Reportar un mensaje de la otra persona. La administración revisa solo ese mensaje (con sus fotos) y decide si lo retira.
export default function ModalReportar({ mensaje, onCerrar }) {
  const { t, td } = useIdioma();
  const motivos = useConfiguracion()?.mensajeria?.motivos_reporte;
  const [motivo, setMotivo] = useState("");
  const [detalle, setDetalle] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState("");
  const [listo, setListo] = useState(false);

  const enviar = async (e) => {
    e.preventDefault();
    setEnviando(true);
    setError("");
    try {
      await api.reportarMensaje(mensaje.id, { motivo, detalle: detalle.trim() });
      setListo(true);
    } catch (err) {
      setError(err.message);
    } finally {
      setEnviando(false);
    }
  };

  return (
    <Modal tituloId="titulo-reporte" onCerrar={onCerrar} className="w-full max-w-md max-h-[90vh] overflow-y-auto bg-surface-container-lowest rounded-2xl p-6 shadow-xl flex flex-col gap-3">
      <h3 id="titulo-reporte" className="font-headline-md text-headline-md text-primary">{t("Reportar mensaje")}</h3>
      {listo ? (
        <>
          <p role="status" className="font-body-md text-body-md text-on-surface">{t("Gracias. La administración revisará este mensaje.")}</p>
          <button type="button" onClick={onCerrar} className="py-2.5 rounded-xl bg-primary text-on-primary font-label-md text-label-md">{t("Cerrar")}</button>
        </>
      ) : (
        <form onSubmit={enviar} className="flex flex-col gap-3">
          <p className="font-body-sm text-body-sm text-on-surface-variant">{t("La administración verá solo este mensaje, no el resto de la conversación.")}</p>
          <label className="flex flex-col gap-1.5">
            <span className="font-label-md text-label-md text-on-surface font-semibold">{t("Motivo")}</span>
            <select required value={motivo} onChange={(e) => setMotivo(e.target.value)} className="px-3 py-2.5 rounded-xl bg-surface-container-low border border-surface-container-high outline-none focus:border-secondary">
              <option value="">{t("Elige un motivo…")}</option>
              {(motivos || Object.keys(MOTIVOS_REPORTE)).map((m) => <option key={m} value={m}>{td(MOTIVOS_REPORTE[m]) || m}</option>)}
            </select>
          </label>
          <label className="flex flex-col gap-1.5">
            <span className="font-label-md text-label-md text-on-surface font-semibold">{t("Detalle (opcional)")}</span>
            <textarea rows={3} maxLength={300} value={detalle} onChange={(e) => setDetalle(e.target.value)} className="px-4 py-2.5 rounded-xl bg-surface-container-low border border-surface-container-high outline-none focus:border-secondary resize-none" />
          </label>
          {error && <p role="alert" className="font-label-xs text-label-xs text-error">{error}</p>}
          <div className="flex items-center gap-2">
            <button type="button" onClick={onCerrar} className="flex-1 py-2.5 rounded-xl bg-surface-container text-on-surface font-label-md text-label-md hover:bg-surface-container-high">{t("Cancelar")}</button>
            <button type="submit" disabled={!motivo || enviando} className="flex-1 py-2.5 rounded-xl bg-error text-on-error font-label-md text-label-md hover:opacity-90 disabled:opacity-60">
              {enviando ? t("Enviando…") : t("Enviar reporte")}
            </button>
          </div>
        </form>
      )}
    </Modal>
  );
}
