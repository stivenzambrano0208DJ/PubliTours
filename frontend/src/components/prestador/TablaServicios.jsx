import { urlImagen } from "../../api/client";
import { CATEGORIA_ICONOS } from "../../constants";

import { Estrellas } from "../Estrellas";

export default function TablaServicios({ sitios, resumen = {}, cargando, accionando, onNuevo, onEditar, onTogglePausa, onEliminar }) {
  return (
    <section id="servicios" className="w-full bg-surface-container-lowest rounded-2xl shadow-sm overflow-hidden flex flex-col scroll-mt-24">
      <div className="p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div>
          <h2 className="font-title-lg text-title-lg text-on-surface font-semibold">Mis servicios en el catálogo</h2>
          <p className="font-body-sm text-body-sm text-on-surface-variant">{sitios.length} servicio(s) registrado(s)</p>
        </div>
        <button onClick={onNuevo} className="bg-primary-container hover:bg-secondary text-on-primary font-label-md text-label-md px-4 py-2 rounded-xl flex items-center gap-2 shadow-sm transition-all">
          <span className="material-symbols-outlined text-[18px]">add_circle</span>
          <span>Agregar servicio</span>
        </button>
      </div>

      {cargando && <p className="px-5 pb-5 font-body-sm text-body-sm text-on-surface-variant">Cargando...</p>}
      {!cargando && sitios.length === 0 && (
        <p className="px-5 pb-5 font-body-sm text-body-sm text-on-surface-variant">Aún no has publicado servicios en el catálogo.</p>
      )}

      {sitios.length > 0 && (
        <div className="w-full overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-surface-container-low text-outline font-label-xs text-label-xs uppercase tracking-wider">
                <th className="py-3 px-5 font-semibold">Servicio</th>
                <th className="py-3 px-3 font-semibold">Categoría</th>
                <th className="py-3 px-3 font-semibold">Precio</th>
                <th className="py-3 px-3 font-semibold">Reservas</th>
                <th className="py-3 px-3 font-semibold">Calificación</th>
                <th className="py-3 px-3 font-semibold">Estado</th>
                <th className="py-3 px-5 font-semibold text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="font-body-sm text-body-sm">
              {sitios.map((s) => (
                <tr key={s.id} className="hover:bg-surface-container-low/60 transition-colors border-t border-surface-container-low">
                  <td className="py-3 px-5">
                    <div className="flex items-center gap-3">
                      {s.imagen_url ? (
                        <img loading="lazy" decoding="async" src={urlImagen(s.imagen_url)} alt={s.nombre} className="w-10 h-10 rounded-xl object-cover shrink-0" />
                      ) : (
                        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary-container to-secondary flex items-center justify-center shrink-0">
                          <span className="material-symbols-outlined text-on-primary text-[18px]">{CATEGORIA_ICONOS[s.categoria] || "place"}</span>
                        </div>
                      )}
                      <div className="flex flex-col min-w-0">
                        <span className="font-title-sm text-title-sm text-on-surface font-semibold truncate">{s.nombre}</span>
                        <span className="font-label-xs text-label-xs text-outline">{s.municipio}</span>
                      </div>
                    </div>
                  </td>
                  <td className="py-3 px-3">
                    <span className="bg-surface-container text-on-surface font-label-xs text-label-xs px-2.5 py-1 rounded-lg font-medium inline-block">{s.categoria}</span>
                  </td>
                  <td className="py-3 px-3">
                    <span className="font-title-sm text-title-sm font-semibold text-primary">
                      {Number(s.precio) === 0 ? "Gratuito" : `$${Number(s.precio).toLocaleString("es-CO")}`}
                    </span>
                  </td>
                  <td className="py-3 px-3">
                    {(() => {
                      const m = resumen[s.id];
                      if (!m || m.reservas_total === 0) return <span className="font-label-xs text-label-xs text-outline">Sin reservas</span>;
                      return (
                        <div className="flex flex-col">
                          <span className="font-title-sm text-title-sm text-on-surface font-semibold">{m.confirmadas} confirmada(s)</span>
                          <span className="font-label-xs text-label-xs text-outline">
                            {m.pendientes > 0 ? `${m.pendientes} pendiente(s) · ` : ""}${m.ingresos.toLocaleString("es-CO")} COP
                          </span>
                        </div>
                      );
                    })()}
                  </td>
                  <td className="py-3 px-3">
                    {resumen[s.id]?.total_resenas > 0 ? (
                      <span className="inline-flex items-center gap-1 font-label-xs text-label-xs text-on-surface-variant">
                        <Estrellas valor={1} tamano={16} /> {resumen[s.id].promedio} ({resumen[s.id].total_resenas})
                      </span>
                    ) : (
                      <span className="font-label-xs text-label-xs text-outline">Sin reseñas</span>
                    )}
                  </td>
                  <td className="py-3 px-3">
                    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full font-label-xs text-label-xs font-semibold ${
                      s.estado === "activo" ? "bg-secondary-container/50 text-on-secondary-container" : "bg-surface-container-high text-on-surface-variant"
                    }`}>
                      <span className={`w-2 h-2 rounded-full ${s.estado === "activo" ? "bg-secondary" : "bg-outline"}`} />
                      {s.estado === "activo" ? "Activo" : s.estado === "oculto" ? "Oculto por el administrador" : "Pausado"}
                    </span>
                    {s.estado === "oculto" && s.motivo_moderacion && (
                      <p className="mt-1 font-label-xs text-label-xs text-error max-w-[220px]">Motivo: {s.motivo_moderacion}</p>
                    )}
                  </td>
                  <td className="py-3 px-5 text-right">
                    <div className="flex items-center justify-end gap-1">
                      <button onClick={() => onEditar(s)} title="Editar" className="p-1.5 text-on-surface-variant hover:text-primary hover:bg-surface-container rounded-lg transition-colors">
                        <span className="material-symbols-outlined text-[18px]">edit</span>
                      </button>
                      {s.estado !== "oculto" && <button
                        onClick={() => onTogglePausa(s)}
                        disabled={accionando === s.id}
                        title={s.estado === "activo" ? "Pausar" : "Reactivar"}
                        className="p-1.5 text-on-surface-variant hover:text-secondary hover:bg-surface-container rounded-lg transition-colors disabled:opacity-50"
                      >
                        <span className="material-symbols-outlined text-[18px]">{s.estado === "activo" ? "pause_circle" : "play_circle"}</span>
                      </button>}
                      <button
                        onClick={() => onEliminar(s)}
                        disabled={accionando === s.id}
                        title="Eliminar servicio"
                        className="p-1.5 text-on-surface-variant hover:text-error hover:bg-error-container/40 rounded-lg transition-colors disabled:opacity-50"
                      >
                        <span className="material-symbols-outlined text-[18px]">delete</span>
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
