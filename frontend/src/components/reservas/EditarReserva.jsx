import { useState } from "react";
import { api } from "../../api/client";
import CamposReserva from "./CamposReserva";
import Modal from "../Modal";
import { useIdioma } from "../../context/idioma";
import Boton from "../ui/Boton";

// Ventana para cambiar la fecha, las personas o la nota de una reserva sin cancelarla.
export default function EditarReserva({ reserva, onCerrar, onGuardada }) {
  const { t } = useIdioma();
  const esPaquete = Boolean(reserva.paquete);
  const objeto = esPaquete ? reserva.paquete : reserva.sitio;
  const [valores, setValores] = useState({
    fecha: reserva.fecha_servicio, personas: reserva.personas, ninos: reserva.ninos || 0, nota: reserva.nota || "",
  });
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState("");

  const guardar = async (e) => {
    e.preventDefault();
    setGuardando(true);
    setError("");
    try {
      onGuardada(await api.editarReserva(reserva.id, {
        fecha_servicio: valores.fecha, personas: Number(valores.personas) || 1, ninos: Number(valores.ninos) || 0, nota: valores.nota,
      }));
    } catch (err) {
      setError(err.message);
    } finally {
      setGuardando(false);
    }
  };

  const camposPaquete = esPaquete
    ? { cargarFechas: api.fechasBloqueadasPaquete, cargarDisponibilidad: (mes) => api.disponibilidadPaquete(objeto.id, mes), cotizar: null }
    : {};

  return (
    <Modal as="form" etiqueta={t("Modificar reserva")} onCerrar={onCerrar} onSubmit={guardar} className="w-full max-w-md bg-surface-container-lowest rounded-2xl p-6 shadow-xl flex flex-col gap-3 max-h-[90vh] overflow-y-auto [&>*]:shrink-0">
      <div>
        <h3 className="font-headline-md text-headline-md text-primary">{t("Modificar reserva")}</h3>
        <p className="font-body-sm text-body-sm text-on-surface-variant mt-1">{objeto?.nombre}</p>
      </div>
      {reserva.estado === "confirmada" && (
        <p className="p-3 rounded-xl bg-tertiary-fixed/50 font-body-sm text-body-sm text-on-surface flex items-start gap-2">
          <span className="material-symbols-outlined text-on-tertiary-container text-[18px] shrink-0 mt-0.5">info</span>
          {t("Tu reserva está confirmada. Si cambias algo, volverá a quedar")} <strong>pendiente</strong> {t("hasta que el prestador acepte los nuevos datos.")}
        </p>
      )}
      <CamposReserva
        sitio={{ ...objeto, id: objeto.id }}
        valores={valores}
        onCambio={setValores}
        {...camposPaquete}
      />
      {error && <p className="text-error font-body-sm text-body-sm">{error}</p>}
      <div className="flex items-center gap-2 mt-1">
        <Boton variante="secundario" type="button" onClick={onCerrar} className="flex-1 py-2.5">{t("Cancelar")}</Boton>
        <Boton type="submit" disabled={guardando} className="flex-1 py-2.5">
          {guardando ? t("Guardando...") : t("Guardar cambios")}
        </Boton>
      </div>
    </Modal>
  );
}
