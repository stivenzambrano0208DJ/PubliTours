import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api, urlImagen } from "../../api/client";
import { CATEGORIA_ICONOS } from "../../constants";
import ModalMotivo from "../ModalMotivo";
import { useAvisos } from "../../context/avisos";
import Tarjeta from "../ui/Tarjeta";
import Insignia from "../ui/Insignia";

// Moderación de servicios y de paquetes: el administrador no los crea ni edita, solo oculta (con motivo) o vuelve a publicar.
// La lista y el flujo son los mismos; cada tipo solo aporta sus textos, sus llamadas a la API y cómo se ve su primera columna.
function ListaModeracion({ cfg }) {
  const { avisar } = useAvisos();
  const [items, setItems] = useState([]);
  const [texto, setTexto] = useState("");
  const [cargando, setCargando] = useState(true);
  const [ocultando, setOcultando] = useState(null);

  useEffect(() => {
    const t = setTimeout(() => {
      cfg.listar({ texto }).then(setItems).catch(() => {}).finally(() => setCargando(false));
    }, 250);
    return () => clearTimeout(t);
  }, [texto, cfg]);

  const cambiarEstado = async (item, estado, motivo) => {
    try {
      await cfg.moderar(item.id, estado, motivo);
      setItems((prev) => prev.map((x) => (x.id === item.id ? { ...x, estado, motivo_moderacion: estado === "oculto" ? motivo : null } : x)));
      setOcultando(null);
    } catch (err) {
      avisar(err.message);
    }
  };

  return (
    <Tarjeta as="section" className="overflow-hidden">
      <div className="p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="font-title-lg text-title-lg text-on-surface font-semibold">{cfg.titulo}</h2>
          <p className="font-body-sm text-body-sm text-on-surface-variant">{cfg.descripcion}</p>
        </div>
        <div className="relative">
          <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-outline text-[18px]">search</span>
          <input
            className="w-full sm:w-64 pl-9 pr-3 py-2 bg-surface-container rounded-xl font-body-sm text-body-sm focus:outline-none focus:bg-surface-container-low"
            placeholder={cfg.buscador}
            value={texto}
            onChange={(e) => setTexto(e.target.value)}
          />
        </div>
      </div>

      {cargando ? (
        <p className="px-5 pb-5 font-body-sm text-body-sm text-on-surface-variant">Cargando...</p>
      ) : items.length === 0 ? (
        <p className="px-5 pb-5 font-body-sm text-body-sm text-on-surface-variant">{cfg.vacio}</p>
      ) : (
        <div className="w-full overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-surface-container-low text-outline font-label-xs text-label-xs uppercase tracking-wider">
                <th className="py-3 px-5 font-semibold">{cfg.columna}</th>
                <th className="py-3 px-3 font-semibold">Prestador</th>
                <th className="py-3 px-3 font-semibold">Calificación</th>
                <th className="py-3 px-3 font-semibold">Estado</th>
                <th className="py-3 px-5 font-semibold text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="font-body-sm text-body-sm">
              {items.map((x) => {
                const { imagen, icono, detalle } = cfg.presentar(x);
                return (
                  <tr key={x.id} className="border-t border-surface-container-low hover:bg-surface-container-low/60 transition-colors">
                    <td className="py-3 px-5">
                      <div className="flex items-center gap-3">
                        {imagen ? (
                          <img loading="lazy" decoding="async" src={urlImagen(imagen)} alt="" className="w-10 h-10 rounded-xl object-cover shrink-0" />
                        ) : (
                          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary-container to-secondary flex items-center justify-center shrink-0">
                            <span className="material-symbols-outlined text-on-primary text-[18px]">{icono}</span>
                          </div>
                        )}
                        <div className="flex flex-col min-w-0">
                          <span className="font-title-sm text-title-sm text-on-surface font-semibold truncate">{x.nombre}</span>
                          <span className={`font-label-xs text-label-xs text-outline${cfg.truncarDetalle ? " truncate" : ""}`}>{detalle}</span>
                        </div>
                      </div>
                    </td>
                    <td className="py-3 px-3 text-on-surface-variant">{x.Prestador?.nombre_negocio || "—"}</td>
                    <td className="py-3 px-3 text-on-surface-variant">{x.total_resenas > 0 ? `${x.calificacion_promedio} (${x.total_resenas})` : "Sin reseñas"}</td>
                    <td className="py-3 px-3">
                      <Insignia tono={x.estado === "activo" ? "activo" : "inactivo"} punto>
                        {x.estado === "activo" ? "Publicado" : x.estado === "oculto" ? "Oculto por ti" : "Pausado por el prestador"}
                      </Insignia>
                    </td>
                    <td className="py-3 px-5 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Link to={`${cfg.rutaVer}/${x.id}`} className="px-3 py-1.5 rounded-xl bg-surface-container text-on-surface font-label-xs text-label-xs font-semibold hover:bg-surface-container-high transition-colors">Ver</Link>
                        {x.estado === "activo" && (
                          <button onClick={() => setOcultando(x)} className="px-3 py-1.5 rounded-xl bg-surface-container text-error font-label-xs text-label-xs font-semibold hover:bg-error-container transition-colors">Ocultar</button>
                        )}
                        {x.estado === "oculto" && (
                          <button onClick={() => cambiarEstado(x, "activo")} className="px-3 py-1.5 rounded-xl bg-primary text-on-primary font-label-xs text-label-xs font-semibold hover:bg-secondary transition-colors">Publicar</button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {ocultando && (
        <ModalMotivo
          titulo={cfg.modal.titulo}
          descripcion={cfg.modal.descripcion(ocultando)}
          etiqueta="Motivo (se lo enviamos al prestador)"
          placeholder={cfg.modal.placeholder}
          textoConfirmar={cfg.modal.confirmar}
          peligro
          onConfirmar={(motivo) => cambiarEstado(ocultando, "oculto", motivo)}
          onCerrar={() => setOcultando(null)}
        />
      )}
    </Tarjeta>
  );
}

const SERVICIOS = {
  titulo: "Moderación de servicios",
  descripcion: "Oculta contenido inapropiado; el prestador recibe un aviso con el motivo.",
  buscador: "Buscar por nombre o municipio...",
  vacio: "No hay servicios publicados todavía.",
  columna: "Servicio",
  rutaVer: "/sitios",
  listar: (filtros) => api.sitiosAdmin(filtros),
  moderar: (id, estado, motivo) => api.moderarSitio(id, estado, motivo),
  presentar: (s) => ({ imagen: s.imagen_url, icono: CATEGORIA_ICONOS[s.categoria] || "place", detalle: `${s.municipio} · ${s.categoria}` }),
  modal: {
    titulo: "Ocultar servicio",
    descripcion: (s) => `"${s.nombre}" dejará de aparecer en el catálogo. El prestador recibirá un aviso.`,
    placeholder: "Ej. La descripción no corresponde al servicio real.",
    confirmar: "Ocultar servicio",
  },
};

const PAQUETES = {
  titulo: "Moderación de paquetes",
  descripcion: "Oculta paquetes engañosos; el prestador recibe un aviso con el motivo y no puede reactivarlos.",
  buscador: "Buscar por nombre...",
  vacio: "Aún no hay paquetes en la plataforma.",
  columna: "Paquete",
  rutaVer: "/paquetes",
  truncarDetalle: true,
  listar: (filtros) => api.paquetesAdmin(filtros),
  moderar: (id, estado, motivo) => api.moderarPaquete(id, estado, motivo),
  presentar: (p) => ({ imagen: p.imagen_url || p.items?.map((i) => i.sitio?.imagen_url).find(Boolean), icono: "inventory_2", detalle: p.items?.map((i) => i.sitio?.nombre).join(" + ") }),
  modal: {
    titulo: "Ocultar paquete",
    descripcion: (p) => `"${p.nombre}" dejará de aparecer y no podrá reservarse. El prestador recibirá un aviso y no podrá reactivarlo.`,
    placeholder: "Ej. La descripción no corresponde a lo que incluye el paquete.",
    confirmar: "Ocultar paquete",
  },
};

export const ServiciosAdmin = () => <ListaModeracion cfg={SERVICIOS} />;
export const PaquetesAdmin = () => <ListaModeracion cfg={PAQUETES} />;
