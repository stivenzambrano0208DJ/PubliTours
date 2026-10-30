import { useState } from "react";
import { api } from "../../api/client";
import CamposNegocio from "../CamposNegocio";
import Insignia from "../ui/Insignia";

// Prestador sin perfil (caso de cuentas antiguas): crea lo básico y pasa a completar su perfil.
export default function FormularioPerfil({ onCreado }) {
  const [negocio, setNegocio] = useState({ nombre_negocio: "", categoria: "", municipio: "" });
  const [error, setError] = useState("");
  const [guardando, setGuardando] = useState(false);

  const crear = async (e) => {
    e.preventDefault();
    setError("");
    setGuardando(true);
    try {
      onCreado(await api.crearPerfilPrestador(negocio));
    } catch (err) {
      setError(err.message);
    } finally {
      setGuardando(false);
    }
  };

  return (
    <div className="max-w-xl mx-auto px-gutter py-space-xl">
      <div className="bg-surface-container-lowest rounded-3xl p-6 sm:p-8 shadow-[0_10px_35px_-8px_rgba(0,0,0,0.08)]">
        <Insignia tono="etiqueta" className="mb-3">
          <span className="material-symbols-outlined text-[14px]">storefront</span>
          Registro de prestador
        </Insignia>
        <h1 className="font-headline-md text-headline-md text-primary tracking-tight">Crea tu negocio turístico</h1>
        <p className="font-body-sm text-body-sm text-on-surface-variant mt-1 mb-5">
          Empieza con lo básico. En el siguiente paso completarás el resto de tu perfil y lo enviarás a revisión.
        </p>
        <form onSubmit={crear} className="flex flex-col gap-5">
          <CamposNegocio valor={negocio} onChange={setNegocio} />
          {error && <p className="text-error font-body-sm text-body-sm">{error}</p>}
          <button
            type="submit"
            disabled={guardando}
            className="py-3 rounded-xl bg-primary text-on-primary font-title-sm text-title-sm hover:bg-primary-container transition-all disabled:opacity-60 flex items-center justify-center gap-2"
          >
            <span>{guardando ? "Guardando..." : "Continuar"}</span>
            {!guardando && <span className="material-symbols-outlined text-[18px]">arrow_forward</span>}
          </button>
        </form>
      </div>
    </div>
  );
}
