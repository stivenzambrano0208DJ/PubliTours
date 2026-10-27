import { useCallback, useEffect, useRef, useState } from "react";
import jsQR from "jsqr";
import { extraerCodigo } from "../../utils/qr";
import { hoyISO } from "../../utils/fechas";
import { useAvisos } from "../../context/avisos";
import Modal from "../Modal";

const ANCHO_MAX = 640; // se reduce el cuadro antes de analizarlo: basta para un QR y no pesa en celulares modestos

const MENSAJES_CAMARA = {
  NotAllowedError: "No diste permiso para usar la cámara. Actívalo en el navegador o escribe el código a mano.",
  NotFoundError: "Este dispositivo no tiene cámara. Escribe el código a mano.",
  NotReadableError: "La cámara está siendo usada por otra aplicación. Ciérrala o escribe el código a mano.",
};

// Cámara que busca un código QR. Avisa con onCodigo(codigo) la primera vez que lee uno de PubliTours y se detiene.
function Camara({ onCodigo }) {
  const video = useRef(null);
  const lienzo = useRef(null);
  // Sin HTTPS (fuera de localhost) el navegador no deja usar la cámara: se sabe desde el inicio, no hace falta un efecto.
  const sinCamara = !navigator.mediaDevices?.getUserMedia;
  const [estado, setEstado] = useState(sinCamara ? "error" : "iniciando"); // iniciando | activa | error
  const [mensaje, setMensaje] = useState(sinCamara ? "Este navegador no permite usar la cámara aquí (hace falta una conexión segura). Escribe el código a mano." : "");
  const [aviso, setAviso] = useState("");
  const ultimoInvalido = useRef("");

  useEffect(() => {
    if (sinCamara) return undefined;
    let activo = true;
    let flujo = null;
    let cuadro = 0;

    const analizar = () => {
      if (!activo) return;
      const v = video.current;
      const c = lienzo.current;
      if (v && c && v.readyState >= 2 && v.videoWidth > 0) {
        const escala = Math.min(1, ANCHO_MAX / v.videoWidth);
        c.width = Math.round(v.videoWidth * escala);
        c.height = Math.round(v.videoHeight * escala);
        const ctx = c.getContext("2d", { willReadFrequently: true });
        ctx.drawImage(v, 0, 0, c.width, c.height);
        const imagen = ctx.getImageData(0, 0, c.width, c.height);
        const lectura = jsQR(imagen.data, imagen.width, imagen.height, { inversionAttempts: "dontInvert" });
        if (lectura?.data) {
          const codigo = extraerCodigo(lectura.data);
          if (codigo) {
            activo = false;
            flujo?.getTracks().forEach((t) => t.stop());
            onCodigo(codigo);
            return;
          }
          if (ultimoInvalido.current !== lectura.data) {
            ultimoInvalido.current = lectura.data;
            setAviso("Ese QR no es de un comprobante de PubliTours.");
          }
        }
      }
      cuadro = requestAnimationFrame(analizar);
    };

    navigator.mediaDevices.getUserMedia({ video: { facingMode: { ideal: "environment" } }, audio: false })
      .then(async (stream) => {
        if (!activo) { stream.getTracks().forEach((t) => t.stop()); return; }
        flujo = stream;
        video.current.srcObject = stream;
        await video.current.play().catch(() => {});
        setEstado("activa");
        cuadro = requestAnimationFrame(analizar);
      })
      .catch((err) => {
        if (!activo) return;
        setEstado("error");
        setMensaje(MENSAJES_CAMARA[err?.name] || "No se pudo abrir la cámara. Escribe el código a mano.");
      });

    return () => {
      activo = false;
      cancelAnimationFrame(cuadro);
      flujo?.getTracks().forEach((t) => t.stop());
    };
  }, [onCodigo, sinCamara]);

  if (estado === "error") {
    return <p role="alert" className="p-3 rounded-xl bg-error-container text-on-error-container font-body-sm text-body-sm">{mensaje}</p>;
  }
  return (
    <div className="flex flex-col gap-2">
      <div className="relative rounded-2xl overflow-hidden bg-black aspect-square max-h-[55vh] mx-auto w-full">
        <video ref={video} playsInline muted className="w-full h-full object-cover" aria-label="Vista de la cámara" />
        <div className="absolute inset-[18%] border-2 border-white/80 rounded-2xl pointer-events-none" aria-hidden="true" />
        {estado === "iniciando" && <p className="absolute inset-0 flex items-center justify-center text-white font-body-sm text-body-sm">Abriendo la cámara…</p>}
      </div>
      <canvas ref={lienzo} className="hidden" />
      <p className="text-center font-label-xs text-label-xs text-on-surface-variant">Apunta al QR del comprobante del turista.</p>
      {aviso && <p role="status" className="text-center font-label-xs text-label-xs text-error">{aviso}</p>}
    </div>
  );
}

const ETIQUETA_ESTADO = { pendiente: "Pendiente", confirmada: "Confirmada", completada: "Completada", no_asistio: "No asistió", rechazada: "Rechazada", cancelada: "Cancelada" };

// Qué se puede hacer con la reserva leída. Las reglas son las del servidor (que además las vuelve a comprobar).
function Resultado({ reserva, accionando, onAsistio, onNoAsistio }) {
  const { estado, fecha_servicio: fecha } = reserva;
  const hoy = hoyISO();
  const nombre = reserva.paquete?.nombre || reserva.sitio?.nombre;

  let veredicto;
  if (estado === "confirmada" && fecha <= hoy) veredicto = { tono: "ok", icono: "verified", texto: "Reserva válida. Registra si el turista asistió." };
  else if (estado === "confirmada") veredicto = { tono: "info", icono: "event", texto: `Reserva válida para el ${fecha}. Podrás registrar la asistencia desde ese día.` };
  else if (estado === "completada") veredicto = { tono: "info", icono: "task_alt", texto: "La asistencia de esta reserva ya quedó registrada." };
  else if (estado === "no_asistio") veredicto = { tono: "info", icono: "person_off", texto: "Esta reserva ya se registró como «no asistió»." };
  else if (estado === "pendiente") veredicto = { tono: "alerta", icono: "hourglass_top", texto: "Esta reserva aún está pendiente: confírmala antes de atender al turista." };
  else veredicto = { tono: "mal", icono: "block", texto: `Esta reserva está ${ETIQUETA_ESTADO[estado]?.toLowerCase() || estado}: no es válida para atender.` };

  const color = { ok: "bg-secondary-container/40 text-on-secondary-container", info: "bg-surface-container text-on-surface", alerta: "bg-amber-50 text-on-surface", mal: "bg-error-container text-on-error-container" }[veredicto.tono];

  return (
    <div className="flex flex-col gap-3">
      <div className={`p-3 rounded-xl flex items-start gap-2 font-body-sm text-body-sm ${color}`} role="status">
        <span className="material-symbols-outlined text-[20px] shrink-0" aria-hidden="true">{veredicto.icono}</span>
        <span>{veredicto.texto}</span>
      </div>

      <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 p-3 rounded-xl bg-surface-container-low font-body-sm text-body-sm">
        <dt className="text-on-surface-variant">Código</dt><dd className="font-mono font-semibold text-on-surface">{reserva.codigo}</dd>
        <dt className="text-on-surface-variant">Turista</dt><dd className="text-on-surface">{reserva.turista?.nombre || "—"}</dd>
        <dt className="text-on-surface-variant">Servicio</dt><dd className="text-on-surface">{nombre}</dd>
        <dt className="text-on-surface-variant">Fecha</dt><dd className="text-on-surface">{fecha}</dd>
        <dt className="text-on-surface-variant">Personas</dt><dd className="text-on-surface">{reserva.personas}</dd>
        <dt className="text-on-surface-variant">Estado</dt><dd className="text-on-surface">{ETIQUETA_ESTADO[estado] || estado}</dd>
      </dl>

      {estado === "confirmada" && fecha <= hoy && (
        <div className="flex gap-2">
          <button type="button" onClick={onAsistio} disabled={accionando} className="flex-1 py-3 rounded-xl bg-primary text-on-primary font-label-md text-label-md font-semibold hover:bg-secondary transition-colors disabled:opacity-50">
            {accionando ? "Guardando…" : "Asistió"}
          </button>
          <button type="button" onClick={onNoAsistio} disabled={accionando} className="flex-1 py-3 rounded-xl bg-surface-container text-on-surface font-label-md text-label-md font-semibold hover:bg-surface-container-high transition-colors disabled:opacity-50">
            No asistió
          </button>
        </div>
      )}
    </div>
  );
}

// Ventana para atender a un turista: escanea el QR de su comprobante (o escribe el código) y registra su asistencia.
export default function EscanerAsistencia({ reservas, accionando, onAccion, onCerrar }) {
  const { confirmar } = useAvisos();
  const [codigo, setCodigo] = useState(null);
  const [manual, setManual] = useState("");
  const [errorManual, setErrorManual] = useState("");

  const alLeer = useCallback((c) => setCodigo(c), []);
  const reserva = codigo ? reservas.find((r) => r.codigo === codigo) : null;

  const buscarManual = (e) => {
    e.preventDefault();
    const c = extraerCodigo(manual);
    if (!c) { setErrorManual("Ese código no tiene el formato de PubliTours (por ejemplo PT-AB12CD)."); return; }
    setErrorManual("");
    setCodigo(c);
  };

  const otra = () => { setCodigo(null); setManual(""); setErrorManual(""); };

  const asistio = () => onAccion(reserva.id, "asistio");
  const noAsistio = async () => {
    if ((await confirmar(`¿Registrar que ${reserva.turista?.nombre || "el turista"} NO asistió? Es definitivo: no contará como ingreso ni podrá calificar.`, { titulo: "Registrar inasistencia", confirmar: "Sí, no asistió", peligro: true }))) onAccion(reserva.id, "no_asistio");
  };

  return (
    <Modal tituloId="titulo-escaner" onCerrar={onCerrar} cerrarAlPulsarFondo={false} fondo="z-[60] items-end sm:items-center bg-black/50 p-0 sm:p-4" className="w-full sm:max-w-md max-h-[92vh] overflow-y-auto bg-surface-container-lowest rounded-t-3xl sm:rounded-3xl p-space-lg flex flex-col gap-3 shadow-2xl">
      <div className="flex items-center justify-between">
        <h2 id="titulo-escaner" className="flex items-center gap-2 font-title-lg text-title-lg text-primary font-semibold">
          <span className="material-symbols-outlined" aria-hidden="true">qr_code_scanner</span>Atender con QR
        </h2>
        <button type="button" onClick={onCerrar} aria-label="Cerrar" className="w-9 h-9 rounded-full hover:bg-surface-container flex items-center justify-center">
          <span className="material-symbols-outlined" aria-hidden="true">close</span>
        </button>
      </div>

      {!codigo && (
        <>
          <Camara onCodigo={alLeer} />
          <form onSubmit={buscarManual} className="flex flex-col gap-2 pt-1">
            <label htmlFor="codigo-manual" className="font-label-md text-label-md text-on-surface-variant">¿Sin cámara? Escribe el código</label>
            <div className="flex gap-2">
              <input
                id="codigo-manual" value={manual} onChange={(e) => setManual(e.target.value)} placeholder="PT-AB12CD" autoComplete="off" autoCapitalize="characters" maxLength={40}
                className="flex-1 px-3 py-2.5 rounded-xl bg-surface font-mono border border-outline-variant/40 focus:outline-none focus:ring-2 focus:ring-secondary"
              />
              <button type="submit" disabled={!manual.trim()} className="px-4 rounded-xl bg-primary text-on-primary font-label-md text-label-md font-semibold disabled:opacity-50">Buscar</button>
            </div>
            {errorManual && <p role="alert" className="font-label-xs text-label-xs text-error">{errorManual}</p>}
          </form>
        </>
      )}

      {codigo && !reserva && (
        <>
          <p role="alert" className="p-3 rounded-xl bg-error-container text-on-error-container font-body-sm text-body-sm">
            No encontramos la reserva <strong className="font-mono">{codigo}</strong> en tu negocio. Puede ser de otro prestador o no existir.
          </p>
          <button type="button" onClick={otra} className="py-3 rounded-xl bg-surface-container font-label-md text-label-md font-semibold hover:bg-surface-container-high">Escanear otra</button>
        </>
      )}

      {codigo && reserva && (
        <>
          <Resultado reserva={reserva} accionando={accionando === reserva.id} onAsistio={asistio} onNoAsistio={noAsistio} />
          <button type="button" onClick={otra} className="py-3 rounded-xl bg-surface-container font-label-md text-label-md font-semibold hover:bg-surface-container-high">Escanear otra</button>
        </>
      )}
    </Modal>
  );
}
