import { useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { api, urlImagen } from "../api/client";
import { useAuth } from "../context/auth";
import { CATEGORIA_ICONOS, fechaMinima } from "../constants";
import CamposReserva from "../components/reservas/CamposReserva";
import BotonPreguntar from "../components/mensajes/BotonPreguntar";
import PoliticaCancelacion from "../components/sitio/PoliticaCancelacion";
import ResenasSitio from "../components/sitio/ResenasSitio";
import { Estrellas } from "../components/Estrellas";
import { useConsulta } from "../hooks/useConsulta";
import { pesos } from "../utils/moneda";


export default function PaqueteDetalle() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { usuario } = useAuth();

  const { datos: paquete, error, cargando } = useConsulta(id, () => api.obtenerPaquete(id));

  const [reserva, setReserva] = useState({ fecha: fechaMinima(), personas: 1, nota: "" });
  const [enviando, setEnviando] = useState(false);
  const [reservaOk, setReservaOk] = useState(false);
  const [errorReserva, setErrorReserva] = useState("");

  const porDia = useMemo(() => {
    const dias = {};
    (paquete?.items || []).forEach((i) => { (dias[i.dia] ||= []).push(i); });
    return Object.entries(dias).sort(([a], [b]) => Number(a) - Number(b));
  }, [paquete]);

  // Galería: la portada propia, las fotos de la galería del paquete y al final las de los servicios incluidos.
  const fotos = useMemo(() => {
    const lista = [
      paquete?.imagen_url,
      ...(paquete?.imagenes || []).map((i) => i.imagen_url),
      ...(paquete?.items || []).map((i) => i.sitio?.imagen_url),
    ].filter(Boolean);
    return [...new Set(lista)];
  }, [paquete]);
  const [visorIndice, setVisorIndice] = useState(null);

  const esAdmin = usuario?.rol === "administrador";
  const esPropio = usuario?.rol === "prestador" && paquete?.Prestador && usuario?.nombre === paquete.Prestador.nombre_negocio;

  const reservar = async (e) => {
    e.preventDefault();
    if (!usuario) { navigate("/login"); return; }
    setEnviando(true);
    setErrorReserva("");
    try {
      await api.solicitarReserva({ paquete_id: paquete.id, fecha_servicio: reserva.fecha, personas: Number(reserva.personas) || 1, nota: reserva.nota });
      setReservaOk(true);
    } catch (err) {
      setErrorReserva(err.message);
    } finally {
      setEnviando(false);
    }
  };

  if (cargando) return <p className="max-w-[1360px] mx-auto px-gutter py-space-xl font-body-md text-body-md text-on-surface-variant">Cargando...</p>;
  if (error || !paquete) {
    return (
      <div className="max-w-md mx-auto px-gutter py-space-xl text-center">
        <p className="text-error font-body-md text-body-md">{error || "Paquete no encontrado."}</p>
        <Link to="/paquetes" className="inline-block mt-4 px-5 py-2.5 rounded-xl bg-primary text-on-primary font-label-md text-label-md">Ver paquetes</Link>
      </div>
    );
  }

  const disponible = paquete.estado === "activo";

  return (
    <div className="max-w-[1360px] mx-auto px-gutter py-space-xl flex flex-col gap-space-lg">
      <nav className="flex items-center gap-2 font-label-xs text-label-xs text-on-surface-variant">
        <Link to="/paquetes" className="hover:text-primary transition-colors">Paquetes</Link>
        <span className="material-symbols-outlined text-[14px]">chevron_right</span>
        <span className="text-secondary font-semibold">{paquete.nombre}</span>
      </nav>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-space-lg items-start">
        <div className="lg:col-span-8 flex flex-col gap-space-lg">
          {fotos.length > 0 && (
            <div className={`grid gap-2 rounded-3xl overflow-hidden ${fotos.length === 1 ? "grid-cols-1" : "grid-cols-4 grid-rows-2"} h-72 md:h-96`}>
              {fotos.slice(0, 5).map((f, i) => (
                <button
                  type="button"
                  key={f}
                  onClick={() => setVisorIndice(i)}
                  aria-label={i === 0 ? `Ver fotos de ${paquete.nombre}` : `Ver foto ${i + 1}`}
                  className={`relative w-full h-full overflow-hidden ${fotos.length === 1 ? "" : i === 0 ? "col-span-2 row-span-2" : ""}`}
                >
                  <img src={urlImagen(f)} alt={i === 0 ? paquete.nombre : ""} className="w-full h-full object-cover hover:scale-105 transition-transform duration-300" />
                  {i === 4 && fotos.length > 5 && (
                    <span className="absolute inset-0 bg-black/55 text-white font-title-lg text-title-lg font-bold flex items-center justify-center">+{fotos.length - 5}</span>
                  )}
                </button>
              ))}
            </div>
          )}

          <header className="flex flex-col gap-2">
            <h1 className="font-headline-xl text-headline-xl text-primary tracking-tight">{paquete.nombre}</h1>
            <p className="font-body-sm text-body-sm text-on-surface-variant flex flex-wrap items-center gap-x-3 gap-y-1">
              <span className="inline-flex items-center gap-1"><span className="material-symbols-outlined text-[16px]">storefront</span><Link to={`/negocios/${paquete.Prestador?.id}`} className="hover:text-secondary hover:underline transition-colors">{paquete.Prestador?.nombre_negocio}</Link></span>
              <span className="inline-flex items-center gap-1"><span className="material-symbols-outlined text-[16px]">location_on</span>{paquete.Prestador?.municipio}</span>
              <span className="inline-flex items-center gap-1 text-secondary font-semibold"><span className="material-symbols-outlined text-[16px]">verified</span>Prestador verificado</span>
              {paquete.total_resenas > 0 && (
                <span className="inline-flex items-center gap-1.5"><Estrellas valor={paquete.calificacion_promedio} tamano={16} />{paquete.calificacion_promedio} ({paquete.total_resenas})</span>
              )}
            </p>
            {paquete.descripcion && <p className="font-body-md text-body-md text-on-surface-variant mt-1 whitespace-pre-line">{paquete.descripcion}</p>}
          </header>

          <section className="flex flex-col gap-3">
            <h2 className="font-headline-md text-headline-md text-primary font-bold">Qué incluye</h2>
            {porDia.map(([dia, items]) => (
              <div key={dia} className="flex flex-col gap-2">
                {porDia.length > 1 && <span className="font-label-md text-label-md text-secondary font-bold uppercase tracking-wider">Día {dia}</span>}
                {items.map((i) => (
                  <Link key={i.id} to={`/sitios/${i.sitio_id}`} className="group flex items-center gap-4 p-3 rounded-2xl bg-surface-container-lowest shadow-sm hover:shadow-md transition-all">
                    {i.sitio?.imagen_url ? (
                      <img loading="lazy" decoding="async" src={urlImagen(i.sitio.imagen_url)} alt="" className="w-20 h-20 rounded-xl object-cover shrink-0" />
                    ) : (
                      <div className="w-20 h-20 rounded-xl bg-gradient-to-br from-primary-container to-secondary flex items-center justify-center shrink-0">
                        <span className="material-symbols-outlined text-on-primary text-[28px]">{CATEGORIA_ICONOS[i.sitio?.categoria] || "place"}</span>
                      </div>
                    )}
                    <div className="flex flex-col min-w-0 flex-1">
                      <span className="font-title-sm text-title-sm text-on-surface font-semibold group-hover:text-secondary transition-colors">{i.sitio?.nombre}</span>
                      <span className="font-label-xs text-label-xs text-outline">{i.sitio?.municipio} · {i.sitio?.categoria}{i.sitio?.horario ? ` · ${i.sitio.horario}` : ""}</span>
                      {i.sitio?.descripcion && <span className="font-body-sm text-body-sm text-on-surface-variant line-clamp-1 mt-0.5">{i.sitio.descripcion}</span>}
                    </div>
                    <span className="font-label-xs text-label-xs text-outline shrink-0 hidden sm:block">suelto {Number(i.sitio?.precio) === 0 ? "gratis" : pesos(i.sitio?.precio)}</span>
                  </Link>
                ))}
              </div>
            ))}
          </section>

          <ResenasSitio paqueteId={paquete.id} />
        </div>

        <aside className="lg:col-span-4">
          <div className="rounded-3xl bg-surface-container-lowest p-6 shadow-xl flex flex-col gap-4">
            <div>
              <div className="flex items-baseline gap-2">
                <span className="font-headline-xl text-headline-xl text-primary font-bold">{Number(paquete.precio) === 0 ? "Gratuito" : pesos(paquete.precio)}</span>
                {Number(paquete.precio) > 0 && <span className="font-body-sm text-body-sm text-on-surface-variant">COP / persona</span>}
              </div>
              {paquete.ahorro > 0 && (
                <p className="font-body-sm text-body-sm text-secondary font-semibold mt-1">
                  Por separado: <span className="line-through text-outline font-normal">{pesos(paquete.precio_suelto)}</span> · ahorras {pesos(paquete.ahorro)} por persona
                </p>
              )}
            </div>

            {esAdmin ? (
              <p className="p-4 rounded-xl bg-surface-container-low text-on-surface-variant font-body-sm text-body-sm">Estás viendo este paquete en modo administrador.</p>
            ) : esPropio ? (
              <p className="p-4 rounded-xl bg-surface-container-low text-on-surface-variant font-body-sm text-body-sm">Este es uno de tus paquetes. Gestiónalo desde tu Portal Prestador.</p>
            ) : !disponible ? (
              <p className="p-4 rounded-xl bg-surface-container-low text-on-surface-variant font-body-sm text-body-sm">Este paquete no está disponible en este momento.</p>
            ) : !reservaOk ? (
              <form onSubmit={reservar} className="flex flex-col gap-3">
                <CamposReserva
                  sitio={{ id: paquete.id, precio: paquete.precio, capacidad: paquete.capacidad }}
                  cargarFechas={api.fechasBloqueadasPaquete}
                  cargarDisponibilidad={(mes) => api.disponibilidadPaquete(paquete.id, mes)}
                  cotizar={null}
                  valores={reserva}
                  onCambio={setReserva}
                />
                <PoliticaCancelacion politica={paquete.politica_cancelacion} />
                {errorReserva && <p className="text-error font-body-sm text-body-sm">{errorReserva}</p>}
                <button type="submit" disabled={enviando} className="w-full py-3.5 rounded-xl bg-primary text-on-primary hover:bg-primary-container transition-all font-label-md text-label-md font-bold shadow-lg flex items-center justify-center gap-2 disabled:opacity-60">
                  <span className="material-symbols-outlined text-[20px]">inventory_2</span>
                  <span>{enviando ? "Enviando..." : usuario ? "Reservar paquete" : "Inicia sesión para reservar"}</span>
                </button>
              </form>
            ) : (
              <div className="flex flex-col items-center text-center gap-2 py-2">
                <span className="material-symbols-outlined text-secondary text-[40px]">check_circle</span>
                <h3 className="font-title-lg text-title-lg text-primary">Solicitud enviada</h3>
                <p className="font-body-sm text-body-sm text-on-surface-variant">Tu solicitud del paquete quedó pendiente de confirmación del prestador.</p>
                <button onClick={() => navigate("/mis-reservas")} className="mt-2 w-full py-2.5 rounded-xl bg-primary text-on-primary font-label-md text-label-md hover:bg-primary-container transition-colors">Ver mis reservas</button>
              </div>
            )}
            {!esPropio && (
              <div className="pt-4 border-t border-surface-container-high flex flex-col gap-2">
                <p className="font-body-sm text-body-sm text-on-surface-variant">¿Tienes dudas antes de reservar?</p>
                <BotonPreguntar tema={{ paquete_id: paquete.id }} nombre={paquete.nombre} className="w-full" />
              </div>
            )}
          </div>
        </aside>
      </div>

      {visorIndice !== null && (
        <div className="fixed inset-0 bg-black/90 z-[70] flex items-center justify-center p-4" onClick={() => setVisorIndice(null)}>
          <button onClick={() => setVisorIndice(null)} aria-label="Cerrar visor" className="absolute top-4 right-4 text-white p-2 rounded-full hover:bg-white/10">
            <span className="material-symbols-outlined text-[28px]">close</span>
          </button>
          {fotos.length > 1 && (
            <button
              onClick={(e) => { e.stopPropagation(); setVisorIndice((visorIndice - 1 + fotos.length) % fotos.length); }}
              aria-label="Foto anterior"
              className="absolute left-4 text-white p-2 rounded-full hover:bg-white/10"
            >
              <span className="material-symbols-outlined text-[32px]">chevron_left</span>
            </button>
          )}
          <img
            src={urlImagen(fotos[visorIndice])}
            alt={`${paquete.nombre} ${visorIndice + 1}`}
            className="max-w-full max-h-[85vh] object-contain rounded-xl"
            onClick={(e) => e.stopPropagation()}
          />
          {fotos.length > 1 && (
            <button
              onClick={(e) => { e.stopPropagation(); setVisorIndice((visorIndice + 1) % fotos.length); }}
              aria-label="Foto siguiente"
              className="absolute right-4 text-white p-2 rounded-full hover:bg-white/10"
            >
              <span className="material-symbols-outlined text-[32px]">chevron_right</span>
            </button>
          )}
          <span className="absolute bottom-4 text-white/80 font-label-md text-label-md">{visorIndice + 1} / {fotos.length}</span>
        </div>
      )}
    </div>
  );
}
