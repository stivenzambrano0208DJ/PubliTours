import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api, urlImagen } from "../../api/client";
import { CATEGORIA_ICONOS } from "../../constants";
import ModalMotivo from "../ModalMotivo";

// Moderación de servicios: el administrador no los crea ni edita, solo oculta o vuelve a publicar.
export default function ServiciosAdmin() {
  const [sitios, setSitios] = useState([]);
  const [texto, setTexto] = useState("");
  const [cargando, setCargando] = useState(true);
  const [ocultando, setOcultando] = useState(null);

  useEffect(() => {
    const t = setTimeout(() => {
      api.sitiosAdmin({ texto }).then(setSitios).catch(() => {}).finally(() => setCargando(false));
    }, 250);
    return () => clearTimeout(t);
  }, [texto]);

  const cambiarEstado = async (sitio, estado, motivo) => {
    try {
      await api.moderarSitio(sitio.id, estado, motivo);
      setSitios((prev) => prev.map((s) => (s.id === sitio.id ? { ...s, estado, motivo_moderacion: estado === "oculto" ? motivo : null } : s)));
      setOcultando(null);
    } catch (err) {
      alert(err.message);
    }
  };

  return (
    <section className="bg-surface-container-lowest rounded-2xl shadow-sm overflow-hidden">
      <div className="p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="font-title-lg text-title-lg text-on-surface font-semibold">Moderación de servicios</h2>
          <p className="font-body-sm text-body-sm text-on-surface-variant">Oculta contenido inapropiado; el prestador recibe un aviso con el motivo.</p>
        </div>
        <div className="relative">
          <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-outline text-[18px]">search</span>
          <input
            className="w-full sm:w-64 pl-9 pr-3 py-2 bg-surface-container rounded-xl font-body-sm text-body-sm focus:outline-none focus:bg-surface-container-low"
            placeholder="Buscar por nombre o municipio..."
            value={texto}
            onChange={(e) => setTexto(e.target.value)}
          />
        </div>
      </div>

      {cargando ? (
        <p className="px-5 pb-5 font-body-sm text-body-sm text-on-surface-variant">Cargando...</p>
      ) : sitios.length === 0 ? (
        <p className="px-5 pb-5 font-body-sm text-body-sm text-on-surface-variant">No hay servicios publicados todavía.</p>
      ) : (
        <div className="w-full overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-surface-container-low text-outline font-label-xs text-label-xs uppercase tracking-wider">
                <th className="py-3 px-5 font-semibold">Servicio</th>
                <th className="py-3 px-3 font-semibold">Prestador</th>
                <th className="py-3 px-3 font-semibold">Calificación</th>
                <th className="py-3 px-3 font-semibold">Estado</th>
                <th className="py-3 px-5 font-semibold text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="font-body-sm text-body-sm">
              {sitios.map((s) => (
                <tr key={s.id} className="border-t border-surface-container-low hover:bg-surface-container-low/60 transition-colors">
                  <td className="py-3 px-5">
                    <div className="flex items-center gap-3">
                      {s.imagen_url ? (
                        <img src={urlImagen(s.imagen_url)} alt="" className="w-10 h-10 rounded-xl object-cover shrink-0" />
                      ) : (
                        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary-container to-secondary flex items-center justify-center shrink-0">
                          <span className="material-symbols-outlined text-on-primary text-[18px]">{CATEGORIA_ICONOS[s.categoria] || "place"}</span>
                        </div>
                      )}
                      <div className="flex flex-col min-w-0">
                        <span className="font-title-sm text-title-sm text-on-surface font-semibold truncate">{s.nombre}</span>
                        <span className="font-label-xs text-label-xs text-outline">{s.municipio} · {s.categoria}</span>
                      </div>
                    </div>
                  </td>
                  <td className="py-3 px-3 text-on-surface-variant">{s.Prestador?.nombre_negocio || "—"}</td>
                  <td className="py-3 px-3 text-on-surface-variant">{s.total_resenas > 0 ? `${s.calificacion_promedio} (${s.total_resenas})` : "Sin reseñas"}</td>
                  <td className="py-3 px-3">
                    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full font-label-xs text-label-xs font-semibold ${s.estado === "activo" ? "bg-secondary-container/50 text-on-secondary-container" : "bg-surface-container-high text-on-surface-variant"}`}>
                      <span className={`w-2 h-2 rounded-full ${s.estado === "activo" ? "bg-secondary" : "bg-outline"}`} />
                      {s.estado === "activo" ? "Publicado" : s.estado === "oculto" ? "Oculto por ti" : "Pausado por el prestador"}
                    </span>
                  </td>
                  <td className="py-3 px-5 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <Link to={`/sitios/${s.id}`} className="px-3 py-1.5 rounded-xl bg-surface-container text-on-surface font-label-xs text-label-xs font-semibold hover:bg-surface-container-high transition-colors">Ver</Link>
                      {s.estado === "activo" && (
                        <button onClick={() => setOcultando(s)} className="px-3 py-1.5 rounded-xl bg-surface-container text-error font-label-xs text-label-xs font-semibold hover:bg-error-container transition-colors">Ocultar</button>
                      )}
                      {s.estado === "oculto" && (
                        <button onClick={() => cambiarEstado(s, "activo")} className="px-3 py-1.5 rounded-xl bg-primary text-on-primary font-label-xs text-label-xs font-semibold hover:bg-secondary transition-colors">Publicar</button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {ocultando && (
        <ModalMotivo
          titulo="Ocultar servicio"
          descripcion={`"${ocultando.nombre}" dejará de aparecer en el catálogo. El prestador recibirá un aviso.`}
          etiqueta="Motivo (se lo enviamos al prestador)"
          placeholder="Ej. La descripción no corresponde al servicio real."
          textoConfirmar="Ocultar servicio"
          peligro
          onConfirmar={(motivo) => cambiarEstado(ocultando, "oculto", motivo)}
          onCerrar={() => setOcultando(null)}
        />
      )}
    </section>
  );
}
