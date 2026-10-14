import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { api } from "../api/client";
import { fechaCorta } from "../utils/fechas";

// Página pública a la que lleva el QR del comprobante: confirma si el código es válido y muestra datos mínimos.
export default function VerificarReserva() {
  const { codigo } = useParams();
  const [datos, setDatos] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    api.verificarReserva(codigo).then(setDatos).catch((e) => setError(e.message));
  }, [codigo]);

  const valida = datos && (datos.estado === "confirmada" || datos.estado === "completada");

  return (
    <div className="max-w-md mx-auto px-gutter py-space-xl">
      <div className="bg-surface-container-lowest rounded-3xl p-6 shadow-[0_10px_35px_-8px_rgba(0,0,0,0.1)] text-center flex flex-col items-center gap-2">
        {error ? (
          <>
            <span className="material-symbols-outlined text-error text-[48px]">gpp_bad</span>
            <h1 className="font-headline-md text-headline-md text-on-surface">Código no válido</h1>
            <p className="font-body-md text-body-md text-on-surface-variant">{error}</p>
          </>
        ) : !datos ? (
          <p className="font-body-md text-body-md text-on-surface-variant">Verificando...</p>
        ) : (
          <>
            <span className={`material-symbols-outlined text-[48px] ${valida ? "text-secondary" : "text-on-tertiary-container"}`}>{valida ? "verified" : "hourglass_top"}</span>
            <h1 className="font-headline-md text-headline-md text-on-surface">{valida ? "Reserva válida" : `Reserva ${datos.estado}`}</h1>
            <p className="font-title-lg text-title-lg text-primary font-bold tracking-widest">{datos.codigo}</p>
            <dl className="w-full mt-2 text-left flex flex-col gap-2 font-body-md text-body-md">
              <Fila t="Servicio" v={datos.servicio} />
              <Fila t="Fecha" v={<span className="capitalize">{fechaCorta(datos.fecha_servicio)}</span>} />
              <Fila t="Personas" v={datos.personas} />
              <Fila t="Titular" v={datos.titular} />
            </dl>
            {!valida && <p className="font-label-xs text-label-xs text-on-surface-variant mt-2">Solo las reservas confirmadas o completadas dan derecho al servicio.</p>}
          </>
        )}
        <Link to="/" className="mt-3 text-secondary font-label-md text-label-md hover:underline">Ir a PubliTours</Link>
      </div>
    </div>
  );
}

const Fila = ({ t, v }) => (
  <div className="flex justify-between gap-3 border-b border-surface-container-high pb-1.5">
    <dt className="text-on-surface-variant">{t}</dt>
    <dd className="text-on-surface font-semibold text-right">{v}</dd>
  </div>
);
