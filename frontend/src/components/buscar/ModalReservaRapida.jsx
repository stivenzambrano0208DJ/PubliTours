import { useNavigate } from "react-router-dom";
import CamposReserva from "../reservas/CamposReserva";
import { useSolicitudReserva } from "../../hooks/useSolicitudReserva";
import Modal from "../Modal";
import { useIdioma } from "../../context/idioma";
import Boton from "../ui/Boton";

// Reservar un destino sin salir de Explorar. Se monta solo mientras está abierto, así su estado nace limpio cada vez.
export default function ModalReservaRapida({ sitio, onCerrar }) {
  const { t } = useIdioma();
  const navigate = useNavigate();
  const { valores, setValores, enviando, enviada, error, enviar: confirmar } = useSolicitudReserva(sitio);

  return (
    <Modal etiqueta={enviada ? t("Solicitud enviada") : t("Reservar")} onCerrar={onCerrar} className="w-full max-w-sm max-h-[90vh] overflow-y-auto bg-surface-container-lowest rounded-2xl p-6 shadow-xl flex flex-col gap-3">
      {!enviada ? (
        <form onSubmit={confirmar} className="flex flex-col gap-3">
          <h3 className="font-headline-md text-headline-md text-primary">{t("Reservar")}</h3>
          <p className="font-body-sm text-body-sm text-on-surface-variant">{sitio.nombre} · {sitio.municipio}</p>
          <CamposReserva sitio={sitio} valores={valores} onCambio={setValores} />
          {error && <p className="text-error font-body-sm text-body-sm">{error}</p>}
          <div className="flex items-center gap-2 mt-1">
            <Boton variante="secundario" type="button" onClick={onCerrar} className="flex-1 py-2.5">
              {t("Cancelar")}
            </Boton>
            <Boton type="submit" disabled={enviando} className="flex-1 py-2.5">
              {enviando ? t("Enviando...") : "Confirmar"}
            </Boton>
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
            <Boton variante="secundario" onClick={onCerrar} className="flex-1 py-2.5">
              {t("Seguir explorando")}
            </Boton>
            <Boton onClick={() => navigate("/mis-reservas")} className="flex-1 py-2.5">
              {t("Ver mis reservas")}
            </Boton>
          </div>
        </div>
      )}
    </Modal>
  );
}
