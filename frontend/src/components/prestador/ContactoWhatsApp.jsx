import { useState } from "react";
import { api } from "../../api/client";
import { useAvisos } from "../../context/avisos";

export default function ContactoWhatsApp({ perfil, onActualizado }) {
  const { avisar } = useAvisos();
  const [editando, setEditando] = useState(false);
  const [telefono, setTelefono] = useState(perfil.telefono || "");
  const [guardando, setGuardando] = useState(false);

  const guardar = async (e) => {
    e.preventDefault();
    setGuardando(true);
    try {
      const actualizado = await api.actualizarPerfilPrestador(perfil.id, {
        nombre_negocio: perfil.nombre_negocio, categoria: perfil.categoria, municipio: perfil.municipio,
        descripcion: perfil.descripcion, direccion: perfil.direccion, redes: perfil.redes, telefono,
      });
      onActualizado(actualizado);
      setEditando(false);
    } catch (err) {
      avisar(err.message);
    } finally {
      setGuardando(false);
    }
  };

  return (
    <section className="bg-surface-container-lowest rounded-2xl p-5 shadow-sm">
      {!editando ? (
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <span className="material-symbols-outlined text-secondary text-[22px]">chat</span>
            <div>
              <p className="font-label-xs text-label-xs uppercase tracking-wider text-outline font-semibold">WhatsApp de contacto</p>
              <p className="font-title-sm text-title-sm text-on-surface">{perfil.telefono || "Sin número configurado"}</p>
            </div>
          </div>
          <button
            onClick={() => { setTelefono(perfil.telefono || ""); setEditando(true); }}
            className="px-3 py-2 rounded-xl bg-surface-container text-on-surface font-label-xs text-label-xs font-semibold hover:bg-surface-container-high transition-colors"
          >
            {perfil.telefono ? "Editar" : "Agregar número"}
          </button>
        </div>
      ) : (
        <form onSubmit={guardar} className="flex flex-col sm:flex-row items-start sm:items-end gap-3">
          <div className="flex-1 w-full">
            <label className="block font-label-md text-label-md text-on-surface font-semibold mb-1.5">Número de WhatsApp</label>
            <input
              type="tel"
              autoFocus
              className="w-full px-4 py-2.5 rounded-xl bg-surface-container-low border border-surface-container-high outline-none focus:border-secondary"
              placeholder="Ej. 3001234567"
              value={telefono}
              onChange={(e) => setTelefono(e.target.value.replace(/\D/g, ""))}
            />
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <button type="button" onClick={() => setEditando(false)} className="px-4 py-2.5 rounded-xl bg-surface-container text-on-surface font-label-md text-label-md hover:bg-surface-container-high transition-colors">
              Cancelar
            </button>
            <button type="submit" disabled={guardando} className="px-4 py-2.5 rounded-xl bg-primary text-on-primary font-label-md text-label-md hover:bg-primary-container transition-colors disabled:opacity-60">
              {guardando ? "Guardando..." : "Guardar"}
            </button>
          </div>
        </form>
      )}
    </section>
  );
}
