import { useState } from "react";
import Modal from "./Modal";
import Boton from "./ui/Boton";

// Ventana genérica para pedir un motivo antes de una acción (rechazar, ocultar…).
export default function ModalMotivo({ titulo, descripcion, etiqueta, placeholder, textoConfirmar, obligatorio = false, peligro = false, onConfirmar, onCerrar }) {
  const [motivo, setMotivo] = useState("");
  const [enviando, setEnviando] = useState(false);

  const enviar = async (e) => {
    e.preventDefault();
    setEnviando(true);
    try {
      await onConfirmar(motivo.trim());
    } finally {
      setEnviando(false);
    }
  };

  return (
    <Modal as="form" etiqueta={titulo} onCerrar={onCerrar} onSubmit={enviar} className="w-full max-w-md max-h-[90vh] overflow-y-auto bg-surface-container-lowest rounded-2xl p-6 shadow-xl flex flex-col gap-3">
      <h3 className="font-headline-md text-headline-md text-primary">{titulo}</h3>
      {descripcion && <p className="font-body-sm text-body-sm text-on-surface-variant">{descripcion}</p>}
      <label className="flex flex-col gap-1.5">
        <span className="font-label-md text-label-md text-on-surface font-semibold">{etiqueta}</span>
        <textarea
          rows={3}
          maxLength={500}
          autoFocus
          required={obligatorio}
          value={motivo}
          onChange={(e) => setMotivo(e.target.value)}
          placeholder={placeholder}
          className="px-4 py-2.5 rounded-xl bg-surface-container-low border border-surface-container-high outline-none focus:border-secondary resize-none"
        />
      </label>
      <div className="flex items-center gap-2">
        <Boton variante="secundario" type="button" onClick={onCerrar} className="flex-1 py-2.5">
          Volver
        </Boton>
        <button
          type="submit"
          disabled={enviando}
          className={`flex-1 py-2.5 rounded-xl font-label-md text-label-md transition-colors disabled:opacity-60 ${peligro ? "bg-error text-on-error hover:opacity-90" : "bg-primary text-on-primary hover:bg-primary-container"}`}
        >
          {enviando ? "Enviando..." : textoConfirmar}
        </button>
      </div>
    </Modal>
  );
}
