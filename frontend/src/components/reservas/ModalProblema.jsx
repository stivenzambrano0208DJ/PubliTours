import { useState } from "react";
import { api } from "../../api/client";
import { useAuth } from "../../context/auth";
import { useConfiguracion } from "../../hooks/useConfiguracion";
import { MOTIVOS_CASO, motivosPara } from "../../utils/soporte";
import Modal from "../Modal";
import { useIdioma } from "../../context/idioma";

const CAMPO = "px-4 py-2.5 rounded-xl bg-surface-container-low border border-surface-container-high outline-none focus:border-secondary";

// «Tengo un problema con esta reserva»: abre un caso de soporte que la administración revisa y responde por las notificaciones.
export default function ModalProblema({ reserva, onCerrar, onAbierto }) {
  const { t, td } = useIdioma();
  const { usuario } = useAuth();
  const soporte = useConfiguracion()?.soporte;
  const minimo = soporte?.detalle_min || 20;
  const maximo = soporte?.detalle_max || 1000;
  const [motivo, setMotivo] = useState("");
  const [detalle, setDetalle] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState("");
  const [listo, setListo] = useState(false);
  const nombre = reserva.paquete?.nombre || reserva.sitio?.nombre;

  const enviar = async (e) => {
    e.preventDefault();
    setEnviando(true);
    setError("");
    try {
      const caso = await api.abrirCaso({ reserva_id: reserva.id, motivo, detalle: detalle.trim() });
      setListo(true);
      onAbierto?.(caso);
    } catch (err) {
      setError(err.message);
    } finally {
      setEnviando(false);
    }
  };

  return (
    <Modal tituloId="titulo-problema" onCerrar={onCerrar} className="w-full max-w-md max-h-[90vh] overflow-y-auto bg-surface-container-lowest rounded-2xl p-6 shadow-xl flex flex-col gap-3">
      <div>
        <h3 id="titulo-problema" className="font-headline-md text-headline-md text-primary">{t("Tengo un problema con esta reserva")}</h3>
        <p className="font-body-sm text-body-sm text-on-surface-variant">{nombre} · {reserva.fecha_servicio}{reserva.codigo ? ` · ${reserva.codigo}` : ""}</p>
      </div>
      {listo ? (
        <>
          <p role="status" className="font-body-md text-body-md text-on-surface">
            {t("Recibimos tu caso. La administración lo revisará y te responderá por las notificaciones. Puedes seguirlo en «Mis casos de soporte».")}
          </p>
          <button type="button" onClick={onCerrar} className="py-2.5 rounded-xl bg-primary text-on-primary font-label-md text-label-md">{t("Cerrar")}</button>
        </>
      ) : (
        <form onSubmit={enviar} className="flex flex-col gap-3">
          <label className="flex flex-col gap-1.5">
            <span className="font-label-md text-label-md text-on-surface font-semibold">{t("¿Qué pasó?")}</span>
            <select required value={motivo} onChange={(e) => setMotivo(e.target.value)} className={CAMPO}>
              <option value="">{t("Elige una opción…")}</option>
              {motivosPara(usuario?.rol, soporte?.motivos_caso).map((m) => <option key={m} value={m}>{td(MOTIVOS_CASO[m]) || m}</option>)}
            </select>
          </label>
          <label className="flex flex-col gap-1.5">
            <span className="font-label-md text-label-md text-on-surface font-semibold">{t("Cuéntanos los detalles")}</span>
            <textarea
              required rows={5} minLength={minimo} maxLength={maximo} value={detalle} onChange={(e) => setDetalle(e.target.value)}
              placeholder={t("Qué ocurrió, cuándo y qué esperabas. Así la administración puede ayudarte más rápido.")}
              className={`${CAMPO} resize-none`}
            />
            <span className="font-label-xs text-label-xs text-outline">
              {detalle.trim().length < minimo ? `Mínimo ${minimo} caracteres (llevas ${detalle.trim().length}).` : `${detalle.length}/${maximo}`}
            </span>
          </label>
          {error && <p role="alert" className="text-error font-body-sm text-body-sm">{error}</p>}
          <div className="flex items-center gap-2">
            <button type="button" onClick={onCerrar} className="flex-1 py-2.5 rounded-xl bg-surface-container text-on-surface font-label-md text-label-md hover:bg-surface-container-high transition-colors">{t("Volver")}</button>
            <button type="submit" disabled={enviando || !motivo || detalle.trim().length < minimo} className="flex-1 py-2.5 rounded-xl bg-primary text-on-primary font-label-md text-label-md hover:bg-primary-container transition-colors disabled:opacity-60">
              {enviando ? t("Enviando...") : t("Enviar caso")}
            </button>
          </div>
        </form>
      )}
    </Modal>
  );
}
