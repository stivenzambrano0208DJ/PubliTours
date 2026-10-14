import { useState } from "react";
import { api } from "../../api/client";
import { useConsulta } from "../../hooks/useConsulta";

const ACCIONES = {
  negocio_aprobado: "Negocio aprobado",
  negocio_rechazado: "Negocio rechazado",
  usuario_suspendido: "Usuario suspendido",
  usuario_reactivado: "Usuario reactivado",
  servicio_ocultado: "Servicio ocultado",
  servicio_publicado: "Servicio publicado",
  paquete_ocultado: "Paquete ocultado",
  paquete_publicado: "Paquete publicado",
  resena_retirada: "Reseña retirada",
  anuncio_enviado: "Anuncio enviado",
};
const POR_PAGINA = 20;

// Historial de acciones de los administradores: quién hizo qué y cuándo.
export default function AuditoriaAdmin() {
  const [accion, setAccion] = useState("");
  const [page, setPage] = useState(1);
  const { datos, error, cargando } = useConsulta(`${accion}|${page}`, () => api.auditoriaAdmin({ page, limit: POR_PAGINA, ...(accion ? { accion } : {}) }));

  const elegirAccion = (valor) => { setAccion(valor); setPage(1); };

  return (
    <section className="bg-surface-container-lowest rounded-2xl shadow-sm p-5 flex flex-col gap-4">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3">
        <div>
          <h2 className="font-title-lg text-title-lg text-on-surface font-semibold">Historial de acciones</h2>
          <p className="font-body-sm text-body-sm text-on-surface-variant">Registro de lo que hacen los administradores: verificaciones, moderación, suspensiones y anuncios.</p>
        </div>
        <label className="flex flex-col gap-1">
          <span className="font-label-xs text-label-xs text-on-surface-variant">Tipo de acción</span>
          <select value={accion} onChange={(e) => elegirAccion(e.target.value)} className="px-3 py-2 rounded-xl bg-surface-container-low border border-surface-container-high outline-none focus:border-secondary">
            <option value="">Todas</option>
            {Object.entries(ACCIONES).map(([valor, texto]) => <option key={valor} value={valor}>{texto}</option>)}
          </select>
        </label>
      </div>

      {error && <p role="alert" className="font-body-sm text-body-sm text-error">{error}</p>}
      {cargando && <p className="font-body-sm text-body-sm text-on-surface-variant">Cargando...</p>}
      {datos && datos.resultados.length === 0 && <p className="font-body-sm text-body-sm text-on-surface-variant">Aún no hay acciones registradas.</p>}

      {datos && datos.resultados.length > 0 && (
        <>
          <ul className="flex flex-col divide-y divide-surface-container-high">
            {datos.resultados.map((r) => (
              <li key={r.id} className="py-3 flex flex-col sm:flex-row sm:items-start justify-between gap-1 sm:gap-4">
                <div className="min-w-0">
                  <span className="font-label-md text-label-md text-on-surface font-semibold">{ACCIONES[r.accion] || r.accion}</span>
                  {r.detalle && <p className="font-body-sm text-body-sm text-on-surface-variant break-words">{r.detalle}</p>}
                </div>
                <div className="shrink-0 font-label-xs text-label-xs text-outline sm:text-right">
                  <div>{r.actor?.nombre || "Administrador eliminado"}</div>
                  <time dateTime={r.fecha}>{new Date(r.fecha).toLocaleString("es-CO", { dateStyle: "medium", timeStyle: "short" })}</time>
                </div>
              </li>
            ))}
          </ul>
          <div className="flex items-center justify-between">
            <button type="button" disabled={page <= 1} onClick={() => setPage(page - 1)} className="px-4 py-2 rounded-xl bg-surface-container text-on-surface font-label-md text-label-md disabled:opacity-40">Anterior</button>
            <span className="font-label-xs text-label-xs text-on-surface-variant">Página {datos.page} de {datos.total_paginas} · {datos.total} acciones</span>
            <button type="button" disabled={page >= datos.total_paginas} onClick={() => setPage(page + 1)} className="px-4 py-2 rounded-xl bg-surface-container text-on-surface font-label-md text-label-md disabled:opacity-40">Siguiente</button>
          </div>
        </>
      )}
    </section>
  );
}
