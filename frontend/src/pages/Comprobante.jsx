import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { QRCodeSVG } from "qrcode.react";
import { api } from "../api/client";
import { fechaCorta } from "../utils/fechas";
import PoliticaCancelacion from "../components/sitio/PoliticaCancelacion";
import { useIdioma } from "../context/idioma";

const ESTADOS = {
  confirmada: { texto: "Confirmada", clase: "bg-secondary-container text-on-secondary-container" },
  completada: { texto: "Completada", clase: "bg-primary-fixed text-on-primary-fixed-variant" },
  pendiente: { texto: "Pendiente de confirmación", clase: "bg-tertiary-fixed text-on-tertiary-fixed-variant" },
  rechazada: { texto: "Rechazada", clase: "bg-error-container text-error" },
  cancelada: { texto: "Cancelada", clase: "bg-surface-container-high text-on-surface-variant" },
  no_asistio: { texto: "No asistió", clase: "bg-error-container text-error" },
};

// Comprobante imprimible de una reserva, con código y QR que el prestador puede escanear para verificarlo.
export default function Comprobante() {
  const { t, td, locale } = useIdioma();
  const pesos = (n) => (Number(n) === 0 ? t("Gratuito") : `$${Number(n).toLocaleString(locale)} COP`);
  const { id } = useParams();
  const [reserva, setReserva] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    api.obtenerReserva(id).then(setReserva).catch((e) => setError(e.message));
  }, [id]);

  if (error) {
    return (
      <div className="max-w-md mx-auto px-gutter py-space-xl text-center">
        <p className="text-error font-body-md text-body-md">{error}</p>
        <Link to="/mis-reservas" className="inline-block mt-4 px-5 py-2.5 rounded-xl bg-primary text-on-primary font-label-md text-label-md">{t("Mis reservas")}</Link>
      </div>
    );
  }
  if (!reserva) return <p className="max-w-3xl mx-auto px-gutter py-space-xl font-body-md text-body-md text-on-surface-variant">{t("Cargando...")}</p>;

  const estado = ESTADOS[reserva.estado] || ESTADOS.pendiente;
  const urlVerificacion = `${window.location.origin}/verificar/${reserva.codigo}`;
  const nombre = reserva.paquete ? `Paquete: ${reserva.paquete.nombre}` : reserva.sitio?.nombre;
  const valido = reserva.estado === "confirmada" || reserva.estado === "completada";

  return (
    <div className="max-w-2xl mx-auto px-gutter py-space-xl flex flex-col gap-4">
      <div className="flex items-center justify-between gap-3 print:hidden">
        <Link to="/mis-reservas" className="inline-flex items-center gap-1 text-secondary font-label-md text-label-md hover:underline">
          <span className="material-symbols-outlined text-[18px]">arrow_back</span> {t("Mis reservas")}
        </Link>
        <button onClick={() => window.print()} className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-primary text-on-primary font-label-md text-label-md hover:bg-primary-container transition-colors">
          <span className="material-symbols-outlined text-[18px]">print</span> {t("Imprimir o guardar PDF")}
        </button>
      </div>

      <article className="rounded-3xl bg-surface-container-lowest p-6 sm:p-8 shadow-[0_10px_35px_-8px_rgba(0,0,0,0.12)] border border-surface-container-high print:shadow-none print:border-outline">
        <header className="flex items-start justify-between gap-4 pb-5 border-b border-dashed border-outline-variant">
          <div>
            <p className="font-label-xs text-label-xs uppercase tracking-widest text-secondary font-bold">PubliTours · Caquetá Vive IA</p>
            <h1 className="font-headline-md text-headline-md text-primary font-bold mt-1">{t("Comprobante de reserva")}</h1>
          </div>
          <span className={`px-3 py-1 rounded-full font-label-xs text-label-xs font-bold shrink-0 ${estado.clase}`}>{td(estado.texto)}</span>
        </header>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 py-6">
          <div className="sm:col-span-2 flex flex-col gap-3">
            <div>
              <p className="font-label-xs text-label-xs uppercase tracking-wider text-outline font-semibold">{t("Servicio")}</p>
              <p className="font-title-lg text-title-lg text-on-surface font-semibold">{nombre}</p>
              {reserva.paquete && <p className="font-body-sm text-body-sm text-on-surface-variant">{t("Incluye:")} {reserva.paquete.items.map((i) => i.sitio?.nombre).join(" + ")}</p>}
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Dato etiqueta={t("Fecha")} valor={<span className="capitalize">{fechaCorta(reserva.fecha_servicio, locale)}</span>} />
              <Dato etiqueta={t("Personas")} valor={`${reserva.personas}${reserva.ninos ? ` (${(reserva.ninos === 1 ? t("1 niño", { n: reserva.ninos }) : t("{n} niños", { n: reserva.ninos }))})` : ""}`} />
              <Dato etiqueta={t("Titular")} valor={reserva.turista?.nombre} />
              <Dato etiqueta={t("Total")} valor={pesos(reserva.total)} />
            </div>
            {reserva.nota && <Dato etiqueta={t("Nota")} valor={reserva.nota} />}
            <PoliticaCancelacion politica={reserva.politica_cancelacion} />
          </div>

          <div className="flex flex-col items-center gap-2">
            <div className="p-3 bg-white rounded-xl border border-surface-container-high">
              <QRCodeSVG value={urlVerificacion} size={132} />
            </div>
            <p className="font-label-xs text-label-xs text-on-surface-variant">{t("Código de reserva")}</p>
            <p className="font-headline-md text-headline-md text-primary font-bold tracking-widest" data-testid="codigo">{reserva.codigo}</p>
          </div>
        </div>

        <footer className="pt-5 border-t border-dashed border-outline-variant grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <p className="font-label-xs text-label-xs uppercase tracking-wider text-outline font-semibold">{t("Prestador")}</p>
            <p className="font-title-sm text-title-sm text-on-surface font-semibold">{reserva.prestador?.nombre_negocio}</p>
            <p className="font-body-sm text-body-sm text-on-surface-variant">{reserva.prestador?.municipio}{reserva.prestador?.direccion ? ` · ${reserva.prestador.direccion}` : ""}</p>
            {reserva.prestador?.telefono && <p className="font-body-sm text-body-sm text-on-surface-variant">{t("WhatsApp:")} {reserva.prestador.telefono}</p>}
          </div>
          <p className="font-label-xs text-label-xs text-on-surface-variant">
            {valido
              ? t("Presenta este código o el QR al llegar. El prestador puede verificar su validez al escanearlo.")
              : t("Este comprobante solo es válido cuando la reserva está confirmada por el prestador.")}
          </p>
        </footer>
      </article>
    </div>
  );
}

function Dato({ etiqueta, valor }) {
  return (
    <div>
      <p className="font-label-xs text-label-xs uppercase tracking-wider text-outline font-semibold">{etiqueta}</p>
      <p className="font-body-md text-body-md text-on-surface">{valor}</p>
    </div>
  );
}
