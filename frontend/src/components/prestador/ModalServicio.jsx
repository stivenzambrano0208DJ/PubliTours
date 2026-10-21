import { useState } from "react";
import { api, urlImagen } from "../../api/client";
import { CATEGORIAS_NEGOCIO } from "../../constants";
import MapaSeleccionar from "../MapaSeleccionar";
import { advertirSiBajaResolucion, prepararFoto, prepararFotos } from "../../utils/imagenes";
import FechasBloqueadas from "./FechasBloqueadas";
import PreciosAvanzados from "./PreciosAvanzados";
import SelectorPolitica from "./SelectorPolitica";
import { useAvisos } from "../../context/avisos";

const SITIO_VACIO = { nombre: "", categoria: "", municipio: "", precio: "", horario: "", descripcion: "", tipo_viaje: "", capacidad: "", politica_cancelacion: "flexible", latitud: "", longitud: "",
  precio_nino: "", grupo_min_personas: "", grupo_descuento_pct: "", temporadas: [] };
const INPUT = "px-4 py-2.5 rounded-xl bg-surface-container-low border border-surface-container-high outline-none focus:border-secondary";
const TIPOS_IMAGEN = "image/jpeg,image/png,image/webp,image/gif";

// Categorías predeterminadas (las mismas del registro del negocio y de los filtros de búsqueda). Un servicio nuevo parte de la
// categoría del propio negocio; uno antiguo con una categoría escrita a mano la conserva como opción para no perderla al editarlo.
const categoriaInicial = (perfil) => (CATEGORIAS_NEGOCIO.some((c) => c.value === perfil?.categoria) ? perfil.categoria : "");
const opcionesCategoria = (actual) =>
  !actual || CATEGORIAS_NEGOCIO.some((c) => c.value === actual) ? CATEGORIAS_NEGOCIO : [...CATEGORIAS_NEGOCIO, { value: actual, label: actual }];

// Modal de crear/editar servicio. Se monta solo mientras está abierto, así su estado nace limpio cada vez.
export default function ModalServicio({ perfil, sitio, ubicacionPrevia, onCerrar, onGuardado }) {
  const { avisar, confirmar } = useAvisos();
  const [form, setForm] = useState(
    sitio
      ? {
          nombre: sitio.nombre, categoria: sitio.categoria, municipio: sitio.municipio,
          precio: sitio.precio, horario: sitio.horario || "", descripcion: sitio.descripcion || "", tipo_viaje: sitio.tipo_viaje || "", capacidad: sitio.capacidad || "", politica_cancelacion: sitio.politica_cancelacion || "flexible",
          precio_nino: sitio.precio_nino ?? "", grupo_min_personas: sitio.grupo_min_personas || "", grupo_descuento_pct: sitio.grupo_descuento_pct || "",
          temporadas: (sitio.tarifas || []).map((t) => ({ nombre: t.nombre, fecha_desde: t.fecha_desde, fecha_hasta: t.fecha_hasta, precio: t.precio, precio_nino: t.precio_nino ?? "" })),
          latitud: sitio.latitud || "", longitud: sitio.longitud || "",
        }
      : { ...SITIO_VACIO, categoria: categoriaInicial(perfil), municipio: perfil.municipio, latitud: ubicacionPrevia?.latitud || "", longitud: ubicacionPrevia?.longitud || "" }
  );
  const [guardando, setGuardando] = useState(false);
  const [imagenFile, setImagenFile] = useState(null);
  const [imagenPreview, setImagenPreview] = useState(sitio ? urlImagen(sitio.imagen_url) : null);
  // La galería ya viene con el servicio (GET /prestadores/me/sitios): no depende del detalle público, que no muestra servicios ocultos.
  const [galeria, setGaleria] = useState(sitio?.imagenes || []);
  const [subiendoGaleria, setSubiendoGaleria] = useState(false);
  const [eliminandoImagen, setEliminandoImagen] = useState(null);

  const handleSeleccionarImagen = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!(await advertirSiBajaResolucion(file, confirmar))) { e.target.value = ""; return; }
    const lista = await prepararFoto(file);
    setImagenFile(lista);
    setImagenPreview(URL.createObjectURL(lista));
  };

  const handleSubirGaleria = async (e) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0 || !sitio) return;
    for (const file of files) {
      if (!(await advertirSiBajaResolucion(file, confirmar))) { e.target.value = ""; return; }
    }
    setSubiendoGaleria(true);
    try {
      const nuevas = await api.agregarImagenesSitio(sitio.id, await prepararFotos(files));
      setGaleria((prev) => [...prev, ...nuevas]);
    } catch (err) {
      avisar(err.message);
    } finally {
      setSubiendoGaleria(false);
      e.target.value = "";
    }
  };

  const handleEliminarImagenGaleria = async (imagenId) => {
    if (!sitio) return;
    setEliminandoImagen(imagenId);
    try {
      await api.eliminarImagenSitio(sitio.id, imagenId);
      setGaleria((prev) => prev.filter((img) => img.id !== imagenId));
    } catch (err) {
      avisar(err.message);
    } finally {
      setEliminandoImagen(null);
    }
  };

  const guardar = async (e) => {
    e.preventDefault();
    setGuardando(true);
    try {
      const payload = { ...form, precio: Number(form.precio) || 0 };
      if (sitio) await api.actualizarSitio(sitio.id, { ...payload, estado: sitio.estado }, imagenFile);
      else await api.crearSitio({ ...payload, prestador_id: perfil.id }, imagenFile);
      onGuardado();
    } catch (err) {
      avisar(err.message);
    } finally {
      setGuardando(false);
    }
  };

  const campo = (nombre) => ({ value: form[nombre], onChange: (e) => setForm({ ...form, [nombre]: e.target.value }) });

  return (
    <div className="fixed inset-0 bg-black/40 z-[60] flex items-center justify-center p-4" onClick={onCerrar}>
      <form
        onClick={(e) => e.stopPropagation()}
        onSubmit={guardar}
        className="w-full max-w-lg bg-surface-container-lowest rounded-2xl p-6 shadow-xl flex flex-col gap-3 max-h-[90vh] overflow-y-auto [&>*]:shrink-0"
      >
        <h3 className="font-headline-md text-headline-md text-primary">{sitio ? "Editar servicio" : "Nuevo servicio"}</h3>

        <label className="flex flex-col gap-1.5">
          <span className="font-label-md text-label-md text-on-surface font-semibold">Foto de portada</span>
          <div className="flex items-center gap-3">
            <div className="w-20 h-20 rounded-xl overflow-hidden bg-surface-container-low border border-surface-container-high flex items-center justify-center shrink-0">
              {imagenPreview ? (
                <img src={imagenPreview} alt="Vista previa" className="w-full h-full object-cover" />
              ) : (
                <span className="material-symbols-outlined text-outline text-[28px]">image</span>
              )}
            </div>
            <label className="px-4 py-2 rounded-xl bg-surface-container text-on-surface font-label-md text-label-md hover:bg-surface-container-high transition-colors cursor-pointer">
              <span>{imagenPreview ? "Cambiar imagen" : "Subir imagen"}</span>
              <input type="file" accept={TIPOS_IMAGEN} className="hidden" onChange={handleSeleccionarImagen} />
            </label>
          </div>
        </label>

        {sitio && (
          <div className="flex flex-col gap-1.5">
            <span className="font-label-md text-label-md text-on-surface font-semibold">Galería de fotos ({galeria.length})</span>
            <div className="flex flex-wrap gap-2">
              {galeria.map((img) => (
                <div key={img.id} className="relative w-16 h-16 rounded-lg overflow-hidden group">
                  <img src={urlImagen(img.imagen_url)} alt="" className="w-full h-full object-cover" />
                  <button
                    type="button"
                    onClick={() => handleEliminarImagenGaleria(img.id)}
                    disabled={eliminandoImagen === img.id}
                    className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity disabled:opacity-100"
                  >
                    <span className="material-symbols-outlined text-white text-[20px]">
                      {eliminandoImagen === img.id ? "hourglass_top" : "delete"}
                    </span>
                  </button>
                </div>
              ))}
              <label className="w-16 h-16 rounded-lg border-2 border-dashed border-surface-container-high flex items-center justify-center cursor-pointer hover:bg-surface-container-low transition-colors shrink-0">
                {subiendoGaleria ? (
                  <span className="material-symbols-outlined text-outline text-[20px] animate-spin">progress_activity</span>
                ) : (
                  <span className="material-symbols-outlined text-outline text-[20px]">add_photo_alternate</span>
                )}
                <input type="file" accept={TIPOS_IMAGEN} multiple className="hidden" onChange={handleSubirGaleria} disabled={subiendoGaleria} />
              </label>
            </div>
            <p className="font-label-xs text-label-xs text-on-surface-variant">Estas fotos se ven en la página de detalle del sitio. Los cambios se guardan al instante.</p>
          </div>
        )}

        <input className={INPUT} placeholder="Nombre" required {...campo("nombre")} />
        <div className="grid grid-cols-2 gap-3">
          <select className={INPUT} aria-label="Categoría" required {...campo("categoria")}>
            <option value="" disabled>Selecciona una categoría...</option>
            {opcionesCategoria(form.categoria).map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}
          </select>
          <input className={INPUT} placeholder="Municipio" required {...campo("municipio")} />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <input type="number" min="0" className={INPUT} placeholder="Precio (COP)" {...campo("precio")} />
          <input className={INPUT} placeholder="Horario (ej. 8am-5pm)" {...campo("horario")} />
        </div>
        <input className={INPUT} placeholder="Etiquetas (ej. pareja,naturaleza)" {...campo("tipo_viaje")} />
        <textarea className={`${INPUT} resize-none`} rows={3} placeholder="Descripción" {...campo("descripcion")} />
        <label className="flex flex-col gap-1.5">
          <span className="font-label-md text-label-md text-on-surface font-semibold">Cupos por día (personas)</span>
          <input type="number" min="1" className={INPUT} placeholder="Ej. 20" {...campo("capacidad")} />
          <span className="font-label-xs text-label-xs text-on-surface-variant">
            Máximo de personas que atiendes cada día. Si lo dejas vacío, se confirma una sola reserva por fecha.
          </span>
        </label>
        <SelectorPolitica value={form.politica_cancelacion} onChange={(politica_cancelacion) => setForm((prev) => ({ ...prev, politica_cancelacion }))} />
        <PreciosAvanzados valor={form} onChange={(cambios) => setForm((prev) => ({ ...prev, ...cambios }))} />
        {sitio && <FechasBloqueadas sitioId={sitio.id} />}

        <MapaSeleccionar
          lat={form.latitud}
          lng={form.longitud}
          onCambiar={(lat, lng) => setForm({ ...form, latitud: lat, longitud: lng })}
        />

        <div className="flex items-center gap-2 mt-2">
          <button type="button" onClick={onCerrar} className="flex-1 py-2.5 rounded-xl bg-surface-container text-on-surface font-label-md text-label-md hover:bg-surface-container-high transition-colors">
            Cancelar
          </button>
          <button type="submit" disabled={guardando} className="flex-1 py-2.5 rounded-xl bg-primary text-on-primary font-label-md text-label-md hover:bg-primary-container transition-colors disabled:opacity-60">
            {guardando ? (imagenFile ? "Subiendo foto..." : "Guardando...") : sitio ? "Guardar cambios" : "Crear servicio"}
          </button>
        </div>
      </form>
    </div>
  );
}
