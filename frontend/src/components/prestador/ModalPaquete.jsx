import { useMemo, useState } from "react";
import SelectorPolitica from "./SelectorPolitica";
import { api, urlImagen } from "../../api/client";
import { advertirSiBajaResolucion, prepararFoto, prepararFotos } from "../../utils/imagenes";
import { pesos } from "../../utils/moneda";

const INPUT = "px-4 py-2.5 rounded-xl bg-surface-container-low border border-surface-container-high outline-none focus:border-secondary";

// Crear o editar un paquete: se eligen servicios propios activos (con el día en que se hacen) y se fija un precio por persona.
export default function ModalPaquete({ paquete, sitios, onCerrar, onGuardado }) {
  const activos = sitios.filter((s) => s.estado === "activo" || paquete?.items?.some((i) => i.sitio_id === s.id));
  const [form, setForm] = useState({
    nombre: paquete?.nombre || "", descripcion: paquete?.descripcion || "", precio: paquete?.precio ?? "", capacidad: paquete?.capacidad || "",
    politica_cancelacion: paquete?.politica_cancelacion || "flexible",
  });
  const [elegidos, setElegidos] = useState(() => Object.fromEntries((paquete?.items || []).map((i) => [i.sitio_id, i.dia])));
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState("");
  const [imagenFile, setImagenFile] = useState(null);
  const [imagenPreview, setImagenPreview] = useState(paquete?.imagen_url ? urlImagen(paquete.imagen_url) : null);

  // Galería: al editar las fotos se suben y borran al instante; al crear se encolan y se suben al guardar.
  const MAX_GALERIA = 8;
  const [galeria, setGaleria] = useState(paquete?.imagenes || []);
  const [pendientes, setPendientes] = useState([]);
  const [subiendoGaleria, setSubiendoGaleria] = useState(false);
  const [eliminandoFoto, setEliminandoFoto] = useState(null);
  const totalFotos = galeria.length + pendientes.length;

  const elegirFotosGaleria = async (e) => {
    const files = Array.from(e.target.files || []);
    e.target.value = "";
    if (files.length === 0) return;
    if (totalFotos + files.length > MAX_GALERIA) { setError(`La galería admite máximo ${MAX_GALERIA} fotos.`); return; }
    for (const f of files) if (!(await advertirSiBajaResolucion(f))) return;
    setError("");
    setSubiendoGaleria(true);
    try {
      const listas = await prepararFotos(files);
      if (!paquete) {
        setPendientes((prev) => [...prev, ...listas.map((file) => ({ file, url: URL.createObjectURL(file) }))]);
        return;
      }
      const nuevas = await api.agregarImagenesPaquete(paquete.id, listas);
      setGaleria((prev) => [...prev, ...nuevas]);
    } catch (err) {
      setError(err.message);
    } finally {
      setSubiendoGaleria(false);
    }
  };

  const quitarFoto = async (foto) => {
    if (!foto.id) { setPendientes((prev) => prev.filter((p) => p !== foto)); return; }
    setEliminandoFoto(foto.id);
    try {
      await api.eliminarImagenPaquete(paquete.id, foto.id);
      setGaleria((prev) => prev.filter((g) => g.id !== foto.id));
    } catch (err) {
      setError(err.message);
    } finally {
      setEliminandoFoto(null);
    }
  };

  const elegirImagen = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!(await advertirSiBajaResolucion(file))) { e.target.value = ""; return; }
    const lista = await prepararFoto(file);
    setImagenFile(lista);
    setImagenPreview(URL.createObjectURL(lista));
  };

  const ids = Object.keys(elegidos).map(Number);
  const suelto = useMemo(() => activos.filter((s) => ids.includes(s.id)).reduce((t, s) => t + Number(s.precio), 0), [activos, ids]);
  const precio = Number(form.precio) || 0;

  const alternar = (id) => setElegidos((prev) => {
    const n = { ...prev };
    if (id in n) delete n[id]; else n[id] = 1;
    return n;
  });

  const guardar = async (e) => {
    e.preventDefault();
    if (ids.length < 2) { setError("Elige al menos 2 servicios para armar un paquete."); return; }
    setGuardando(true);
    setError("");
    try {
      const payload = { ...form, precio, sitios: ids.map((id) => ({ sitio_id: id, dia: Number(elegidos[id]) || 1 })) };
      if (paquete) {
        await api.actualizarPaquete(paquete.id, payload, imagenFile);
      } else {
        const creado = await api.crearPaquete(payload, imagenFile);
        if (pendientes.length > 0) {
          try {
            await api.agregarImagenesPaquete(creado.id, pendientes.map((p) => p.file));
          } catch (err) {
            alert(`El paquete se creó, pero no se pudieron subir las fotos de la galería: ${err.message}. Puedes agregarlas editando el paquete.`);
          }
        }
      }
      onGuardado();
    } catch (err) {
      setError(err.message);
    } finally {
      setGuardando(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/40 z-[60] flex items-center justify-center p-4" onClick={onCerrar}>
      <form onClick={(e) => e.stopPropagation()} onSubmit={guardar} className="w-full max-w-lg bg-surface-container-lowest rounded-2xl p-6 shadow-xl flex flex-col gap-3 max-h-[90vh] overflow-y-auto [&>*]:shrink-0">
        <h3 className="font-headline-md text-headline-md text-primary">{paquete ? "Editar paquete" : "Nuevo paquete"}</h3>

        <div className="flex flex-col gap-1.5">
          <span className="font-label-md text-label-md text-on-surface font-semibold">Foto de portada <span className="font-normal text-on-surface-variant">(opcional)</span></span>
          <div className="flex items-center gap-3">
            <div className="w-24 h-16 rounded-xl overflow-hidden bg-surface-container-low border border-surface-container-high flex items-center justify-center shrink-0">
              {imagenPreview ? <img src={imagenPreview} alt="Vista previa de la portada" className="w-full h-full object-cover" /> : <span className="material-symbols-outlined text-outline text-[26px]">image</span>}
            </div>
            <label className="px-4 py-2 rounded-xl bg-surface-container text-on-surface font-label-md text-label-md hover:bg-surface-container-high transition-colors cursor-pointer">
              <span>{imagenPreview ? "Cambiar foto" : "Subir foto"}</span>
              <input type="file" accept="image/jpeg,image/png,image/webp,image/gif" className="hidden" onChange={elegirImagen} />
            </label>
          </div>
          <p className="font-label-xs text-label-xs text-on-surface-variant">Si no subes una, usamos la foto de uno de tus servicios. En la página del paquete se muestran también las fotos de los servicios incluidos.</p>
        </div>

        <div className="flex flex-col gap-1.5">
          <span className="font-label-md text-label-md text-on-surface font-semibold">Galería de fotos ({totalFotos}/{MAX_GALERIA})</span>
          <div className="flex flex-wrap gap-2">
            {[...galeria, ...pendientes].map((foto) => (
              <div key={foto.id || foto.url} className="relative w-16 h-16 rounded-lg overflow-hidden group">
                <img src={foto.id ? urlImagen(foto.imagen_url) : foto.url} alt="" className="w-full h-full object-cover" />
                <button
                  type="button"
                  aria-label="Quitar foto"
                  onClick={() => quitarFoto(foto)}
                  disabled={eliminandoFoto === foto.id}
                  className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 focus:opacity-100 flex items-center justify-center transition-opacity disabled:opacity-100"
                >
                  <span className="material-symbols-outlined text-white text-[20px]">{eliminandoFoto === foto.id ? "hourglass_top" : "delete"}</span>
                </button>
              </div>
            ))}
            {totalFotos < MAX_GALERIA && (
              <label className="w-16 h-16 rounded-lg border-2 border-dashed border-surface-container-high flex items-center justify-center cursor-pointer hover:bg-surface-container-low transition-colors shrink-0" title="Agregar fotos">
                <span className={`material-symbols-outlined text-outline text-[20px] ${subiendoGaleria ? "animate-spin" : ""}`}>{subiendoGaleria ? "progress_activity" : "add_photo_alternate"}</span>
                <input type="file" multiple accept="image/jpeg,image/png,image/webp,image/gif" className="hidden" data-galeria="true" onChange={elegirFotosGaleria} disabled={subiendoGaleria} />
              </label>
            )}
          </div>
          <p className="font-label-xs text-label-xs text-on-surface-variant">
            {paquete ? "Los cambios en la galería se guardan al instante." : "Se subirán al crear el paquete."} Se muestran junto con las fotos de los servicios incluidos.
          </p>
        </div>

        <input className={INPUT} placeholder="Nombre del paquete" required minLength={3} value={form.nombre} onChange={(e) => setForm({ ...form, nombre: e.target.value })} />
        <textarea className={`${INPUT} resize-none`} rows={3} placeholder="Descripción: qué vive el turista en este paquete" value={form.descripcion} onChange={(e) => setForm({ ...form, descripcion: e.target.value })} />

        <div className="flex flex-col gap-1.5">
          <span className="font-label-md text-label-md text-on-surface font-semibold">Servicios incluidos ({ids.length})</span>
          {activos.length < 2 ? (
            <p className="p-3 rounded-xl bg-surface-container-low font-body-sm text-body-sm text-on-surface-variant">
              Necesitas al menos 2 servicios activos para armar un paquete. Publica más servicios primero.
            </p>
          ) : (
            <div className="flex flex-col gap-1.5">
              {activos.map((s) => {
                const marcado = s.id in elegidos;
                return (
                  <div key={s.id} className={`flex items-center gap-3 p-2.5 rounded-xl border transition-colors ${marcado ? "border-secondary bg-secondary-container/20" : "border-surface-container-high"}`}>
                    <label className="flex items-center gap-3 flex-1 min-w-0 cursor-pointer">
                      <input type="checkbox" checked={marcado} onChange={() => alternar(s.id)} className="w-4 h-4 accent-[var(--color-secondary)]" />
                      <span className="flex flex-col min-w-0">
                        <span className="font-label-md text-label-md text-on-surface font-semibold truncate">{s.nombre}</span>
                        <span className="font-label-xs text-label-xs text-outline">{Number(s.precio) === 0 ? "Gratuito" : pesos(s.precio)} suelto</span>
                      </span>
                    </label>
                    {marcado && (
                      <label className="flex items-center gap-1.5 font-label-xs text-label-xs text-on-surface-variant shrink-0">
                        Día
                        <input type="number" min="1" max="30" value={elegidos[s.id]} onChange={(e) => setElegidos({ ...elegidos, [s.id]: e.target.value })} className="w-14 px-2 py-1 rounded-lg bg-surface-container-low border border-surface-container-high outline-none focus:border-secondary" />
                      </label>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <div className="grid grid-cols-2 gap-3">
          <label className="flex flex-col gap-1.5">
            <span className="font-label-md text-label-md text-on-surface font-semibold">Precio por persona (COP)</span>
            <input type="number" min="0" required className={INPUT} placeholder="Ej. 150000" value={form.precio} onChange={(e) => setForm({ ...form, precio: e.target.value })} />
          </label>
          <label className="flex flex-col gap-1.5">
            <span className="font-label-md text-label-md text-on-surface font-semibold">Cupos por día</span>
            <input type="number" min="1" className={INPUT} placeholder="Opcional" value={form.capacidad} onChange={(e) => setForm({ ...form, capacidad: e.target.value })} />
          </label>
        </div>

        <SelectorPolitica value={form.politica_cancelacion} onChange={(politica_cancelacion) => setForm({ ...form, politica_cancelacion })} />

        {ids.length >= 2 && (
          <p className={`p-3 rounded-xl font-body-sm text-body-sm ${precio > 0 && precio < suelto ? "bg-secondary-container/30 text-on-secondary-container" : "bg-surface-container-low text-on-surface-variant"}`}>
            Por separado costarían <strong>{pesos(suelto)}</strong> por persona.{" "}
            {precio > 0 && precio < suelto
              ? <>Con tu precio, el turista ahorra <strong>{pesos(suelto - precio)}</strong>: un buen incentivo.</>
              : precio >= suelto && precio > 0 ? "Tu paquete cuesta lo mismo o más que por separado; considera un descuento para atraer reservas." : "Define un precio para ver cuánto ahorra el turista."}
          </p>
        )}

        {error && <p className="text-error font-body-sm text-body-sm">{error}</p>}
        <div className="flex items-center gap-2 mt-1">
          <button type="button" onClick={onCerrar} className="flex-1 py-2.5 rounded-xl bg-surface-container text-on-surface font-label-md text-label-md hover:bg-surface-container-high transition-colors">Cancelar</button>
          <button type="submit" disabled={guardando} className="flex-1 py-2.5 rounded-xl bg-primary text-on-primary font-label-md text-label-md hover:bg-primary-container transition-colors disabled:opacity-60">
            {guardando ? "Guardando..." : paquete ? "Guardar cambios" : "Crear paquete"}
          </button>
        </div>
      </form>
    </div>
  );
}
