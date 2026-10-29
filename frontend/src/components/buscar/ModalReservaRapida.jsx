import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "../../api/client";
import CamposReserva from "../reservas/CamposReserva";
import { fechaMinima } from "../../constants";
import Modal from "../Modal";
import { useIdioma } from "../../context/idioma";

// Reservar un destino sin salir de Explorar. Se monta solo mientras está abierto, así su estado nace limpio cada vez.
export default function ModalReservaRapida({ sitio, onCerrar }) {
  const { t } = useIdioma();
  const navigate = useNavigate();
  const [valores, setValores] = useState({ fecha: fechaMinima(), personas: 1, ninos: 0, nota: "" });
  const [enviando, setEnviando] = useState(false);
  const [enviada, setEnviada] = useState(false);
  const [error, setError] = useState("");

  const confirmar = async (e) => {
    e.preventDefault();
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

  return (
    <Modal etiqueta={enviada ? t("Solicitud enviada") : t("Reservar")} onCerrar={onCerrar} className="w-full max-w-sm max-h-[90vh] overflow-y-auto bg-surface-container-lowest rounded-2xl p-6 shadow-xl flex flex-col gap-3">
      {!enviada ? (
        <form onSubmit={confirmar} className="flex flex-col gap-3">
          <h3 className="font-headline-md text-headline-md text-primary">{t("Reservar")}</h3>
          <p className="font-body-sm text-body-sm text-on-surface-variant">{sitio.nombre} · {sitio.municipio}</p>
          <CamposReserva sitio={sitio} valores={valores} onCambio={setValores} />
          {error && <p className="text-error font-body-sm text-body-sm">{error}</p>}
          <div className="flex items-center gap-2 mt-1">
            <button type="button" onClick={onCerrar} className="flex-1 py-2.5 rounded-xl bg-surface-container text-on-surface font-label-md text-label-md hover:bg-surface-container-high transition-colors">
              {t("Cancelar")}
            </button>
            <button type="submit" disabled={enviando} className="flex-1 py-2.5 rounded-xl bg-primary text-on-primary font-label-md text-label-md hover:bg-primary-container transition-colors disabled:opacity-60">
              {enviando ? t("Enviando...") : "Confirmar"}
            </button>
          </div>
        </form>
      ) : (
        <div className="flex flex-col items-center text-center gap-2 py-2">
          <span className="material-symbols-outlined text-secondary text-[40px]">check_circle</span>
          <h3 className="font-headline-md text-headline-md text-primary">{t("Solicitud enviada")}</h3>
          <p className="font-body-sm text-body-sm text-on-surface-variant">
            {t("Tu solicitud para \"{nombre}\" quedó pendiente de confirmación del prestador.", { nombre: sitio.nombre })}
          </p>
          <div className="flex items-center gap-2 mt-2 w-full">
            <button onClick={onCerrar} className="flex-1 py-2.5 rounded-xl bg-surface-container text-on-surface font-label-md text-label-md hover:bg-surface-container-high transition-colors">
              {t("Seguir explorando")}
            </button>
            <button onClick={() => navigate("/mis-reservas")} className="flex-1 py-2.5 rounded-xl bg-primary text-on-primary font-label-md text-label-md hover:bg-primary-container transition-colors">
              {t("Ver mis reservas")}
            </button>
          </div>
        </div>
      )}
    </Modal>
  );
}
