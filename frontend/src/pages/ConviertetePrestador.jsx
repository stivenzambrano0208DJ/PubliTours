import { useNavigate } from "react-router-dom";
import Comision from "../components/Comision";
import { AvisoSoloEspanol } from "../components/PaginaLegal";
import Tarjeta from "../components/ui/Tarjeta";

const CATEGORIAS = [
  {
    icono: "hiking",
    etiqueta: "Guianza de selva",
    titulo: "Baquianos y Guías",
    descripcion: "Rutas por cañones, senderismo hacia cascadas, avistamiento de aves y recorridos guiados por conocedores del territorio.",
  },
  {
    icono: "cottage",
    etiqueta: "Hospedaje",
    titulo: "Posadas y Fincas Rurales",
    descripcion: "Fincas agroturísticas, cabañas y habitaciones campesinas listas para recibir viajeros.",
  },
  {
    icono: "restaurant",
    etiqueta: "Gastronomía",
    titulo: "Sabores Amazónicos",
    descripcion: "Comedores rurales, fincas cacaoteras y cocinas que rescatan la gastronomía típica de la región.",
  },
  {
    icono: "kayaking",
    etiqueta: "Transporte y aventura",
    titulo: "Rutas Fluviales y 4x4",
    descripcion: "Lancheros, camperos veredales y operadores de actividades de aventura en ríos y senderos.",
  },
];

const PASOS = [
  {
    numero: 1,
    icono: "person_add",
    titulo: "Crea tu cuenta como prestador",
    texto: "Regístrate eligiendo el rol \"Prestador\". Es gratuito y toma menos de un minuto.",
  },
  {
    numero: 2,
    icono: "storefront",
    titulo: "Completa tu perfil de negocio",
    texto: "Desde tu Portal Prestador indica el nombre de tu negocio, categoría, municipio y una descripción.",
  },
  {
    numero: 3,
    icono: "verified",
    titulo: "Espera la aprobación",
    texto: "Un administrador de PubliTours revisa tu perfil. Verás el estado (pendiente, aprobado o rechazado) directamente en tu portal.",
  },
  {
    numero: 4,
    icono: "add_business",
    titulo: "Publica tus servicios",
    texto: "Una vez aprobado, agrega tus sitios o servicios al catálogo y empieza a recibir solicitudes de reserva reales.",
  },
];

const FAQS = [
  {
    pregunta: "¿Cuánto cuesta publicar mi negocio en PubliTours?",
    respuesta: <>Publicar es gratis y hoy no se te cobra nada: no hay membresías ni pasarela de pagos. El modelo de la plataforma prevé una comisión de <Comision /> sobre las reservas aceptadas; por ahora solo la ves como estimación en tu panel. Si algún día se empieza a cobrar, se te avisará antes.</>,
  },
  {
    pregunta: "¿Cómo recibo el pago de mis servicios?",
    respuesta: "PubliTours no procesa pagos. El turista y tú coordinan directamente la forma de pago una vez la reserva queda confirmada; el dinero no pasa por la plataforma.",
  },
  {
    pregunta: "¿Cómo sé si mi perfil fue aprobado?",
    respuesta: "El estado de verificación (pendiente, aprobado o rechazado) aparece en tu Portal Prestador apenas un administrador lo revisa.",
  },
  {
    pregunta: "¿Puedo reservar servicios de otros prestadores?",
    respuesta: "Sí. Como prestador también puedes explorar y reservar servicios de otros negocios verificados del catálogo (excepto los tuyos propios).",
  },
];

export default function ConviertetePrestador() {
  const navigate = useNavigate();

  return (
    <div className="flex flex-col w-full">
      <div className="max-w-[1360px] w-full mx-auto px-gutter pt-space-md empty:hidden"><AvisoSoloEspanol /></div>
      {/* HERO */}
      <section className="relative w-full overflow-hidden bg-primary text-on-primary">
        <div className="absolute -top-24 -right-24 w-96 h-96 rounded-full bg-secondary-fixed/10 blur-3xl pointer-events-none" />
        <div className="absolute top-1/2 -left-20 w-80 h-80 rounded-full bg-tertiary-fixed-dim/15 blur-3xl pointer-events-none" />

        <div className="relative max-w-[1360px] mx-auto px-gutter py-space-xl lg:py-24 flex flex-col gap-8">
          <span className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-primary-container/80 backdrop-blur-md text-secondary-fixed font-label-xs text-label-xs uppercase tracking-wider shadow-sm w-fit">
            <span className="w-2 h-2 rounded-full bg-secondary-fixed animate-pulse" />
            Comunidad de Prestadores del Caquetá
          </span>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-end">
            <div className="lg:col-span-8 flex flex-col gap-6">
              <h1 className="font-headline-xl text-headline-xl text-surface-bright tracking-tight max-w-3xl">
                Publica tu negocio turístico y llega a viajeros reales del Caquetá.
              </h1>
              <p className="font-body-lg text-body-lg text-surface-container-high/90 max-w-2xl leading-relaxed">
                Guías, posadas, fincas, restaurantes y operadores de transporte pueden publicar sus servicios en el
                catálogo verificado de PubliTours y recibir solicitudes de reserva directamente de los turistas.
              </p>
              <div className="flex flex-wrap items-center gap-4 pt-2">
                <button
                  onClick={() => navigate("/registro?rol=prestador")}
                  className="inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-xl bg-secondary hover:bg-on-secondary-container text-on-secondary font-label-md text-label-md transition-all duration-200 shadow-lg hover:shadow-xl hover:-translate-y-0.5"
                >
                  Crear cuenta de prestador
                  <span className="material-symbols-outlined text-[18px]">arrow_forward</span>
                </button>
              </div>
            </div>

            <div className="lg:col-span-4 w-full">
              <div className="p-6 rounded-2xl bg-surface-container-lowest/90 backdrop-blur-xl text-on-surface shadow-2xl flex flex-col gap-3">
                <div className="flex items-center justify-between">
                  <span className="px-2.5 py-1 rounded-full bg-secondary-container text-on-secondary-container font-label-xs text-label-xs font-semibold">
                    Sin pasarela de pagos
                  </span>
                  <span className="material-symbols-outlined text-secondary text-[24px]">handshake</span>
                </div>
                <p className="font-body-sm text-body-sm text-on-surface-variant">
                  Publicar es gratis y PubliTours no procesa pagos: conecta tu negocio con turistas que ya están buscando
                  experiencias reales en el catálogo verificado. El modelo prevé una comisión de <Comision /> sobre reservas aceptadas,
                  hoy solo como estimación en tu panel.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CATEGORÍAS */}
      <section className="max-w-[1360px] mx-auto px-gutter py-space-xl w-full">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-space-lg">
          <div>
            <span className="font-label-xs text-label-xs uppercase tracking-widest text-secondary font-semibold">Comunidad abierta a Caquetá</span>
            <h2 className="font-headline-xl text-headline-xl text-primary tracking-tight mt-1">¿Quiénes pueden ser parte de PubliTours?</h2>
          </div>
          <p className="font-body-md text-body-md text-on-surface-variant max-w-md">
            Desde iniciativas familiares hasta negocios ya consolidados: si ofreces un servicio turístico real en el Caquetá, tienes espacio en el catálogo.
          </p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-space-md">
          {CATEGORIAS.map((c) => (
            <Tarjeta key={c.titulo} className="p-space-lg flex flex-col gap-3">
              <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-primary-container to-secondary flex items-center justify-center text-on-primary">
                <span className="material-symbols-outlined text-[22px]">{c.icono}</span>
              </div>
              <span className="font-label-xs text-label-xs uppercase font-semibold text-secondary">{c.etiqueta}</span>
              <h3 className="font-title-lg text-title-lg text-on-surface">{c.titulo}</h3>
              <p className="font-body-sm text-body-sm text-on-surface-variant leading-relaxed">{c.descripcion}</p>
            </Tarjeta>
          ))}
        </div>
      </section>

      {/* CÓMO FUNCIONA (proceso real) */}
      <section className="w-full bg-surface-container-low py-space-xl">
        <div className="max-w-[1360px] mx-auto px-gutter">
          <div className="text-center max-w-2xl mx-auto mb-space-xl">
            <span className="px-3.5 py-1 rounded-full bg-secondary-container/60 text-secondary font-label-xs text-label-xs uppercase font-semibold tracking-wider">
              Proceso real de vinculación
            </span>
            <h2 className="font-headline-xl text-headline-xl text-primary tracking-tight mt-3">¿Cómo funciona?</h2>
            <p className="font-body-md text-body-md text-on-surface-variant mt-2">
              Así de simple es publicar tu negocio: sin trámites externos, sin intermediarios.
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-space-md">
            {PASOS.map((p) => (
              <Tarjeta key={p.numero} className="p-space-lg flex flex-col gap-3">
                <div className="w-9 h-9 rounded-full bg-primary-container text-on-primary flex items-center justify-center font-title-sm text-title-sm font-bold">
                  {p.numero}
                </div>
                <div className="flex items-center gap-2 text-secondary">
                  <span className="material-symbols-outlined text-[20px]">{p.icono}</span>
                </div>
                <h4 className="font-title-sm text-title-sm text-on-surface font-semibold">{p.titulo}</h4>
                <p className="font-body-sm text-body-sm text-on-surface-variant">{p.texto}</p>
              </Tarjeta>
            ))}
          </div>
        </div>
      </section>

      {/* CTA de registro */}
      <section className="max-w-[1360px] mx-auto px-gutter py-space-xl w-full">
        <div className="rounded-3xl bg-gradient-to-br from-primary-container to-secondary text-on-primary p-space-xl shadow-xl flex flex-col md:flex-row items-center justify-between gap-space-md">
          <div>
            <h2 className="font-headline-md text-headline-md font-bold">¿Listo para publicar tu negocio?</h2>
            <p className="font-body-md text-body-md text-on-primary-container mt-1 max-w-xl">
              Crea tu cuenta de prestador gratis y completa tu perfil de negocio en minutos.
            </p>
          </div>
          <button
            onClick={() => navigate("/registro?rol=prestador")}
            className="shrink-0 inline-flex items-center gap-2 px-space-lg py-3.5 rounded-xl bg-surface-container-lowest text-primary hover:bg-surface font-title-sm text-title-sm shadow-md transition-all"
          >
            Crear cuenta de prestador
            <span className="material-symbols-outlined text-[18px]">arrow_forward</span>
          </button>
        </div>
      </section>

      {/* FAQ real */}
      <section className="w-full bg-surface-container-low py-space-xl">
        <div className="max-w-[880px] mx-auto px-gutter">
          <div className="text-center mb-space-lg">
            <span className="font-label-xs text-label-xs uppercase tracking-widest text-secondary font-semibold">Preguntas frecuentes</span>
            <h2 className="font-headline-xl text-headline-xl text-primary tracking-tight mt-1">Dudas comunes de prestadores</h2>
          </div>
          <div className="flex flex-col gap-space-sm">
            {FAQS.map((f) => (
              <Tarjeta key={f.pregunta} className="p-space-md">
                <h4 className="font-title-sm text-title-sm text-primary mb-1">{f.pregunta}</h4>
                <p className="font-body-sm text-body-sm text-on-surface-variant leading-relaxed">{f.respuesta}</p>
              </Tarjeta>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
