// Perfil ya enviado: el prestador espera la decisión del administrador.
export default function EstadoVerificacion({ perfil }) {
  return (
    <div className="max-w-md mx-auto px-gutter py-space-xl">
      <div className="bg-surface-container-lowest rounded-3xl p-6 shadow-[0_10px_35px_-8px_rgba(0,0,0,0.08)] text-center">
        <span className="material-symbols-outlined text-[40px] text-on-tertiary-container">hourglass_top</span>
        <h1 className="font-headline-md text-headline-md text-on-surface mt-2">{perfil.nombre_negocio}</h1>
        <p className="font-body-md text-body-md text-on-surface-variant mt-2">
          Tu negocio está pendiente de verificación por un administrador. Te avisaremos por notificación cuando lo revise; si lo aprueba, podrás publicar sitios y recibir reservas.
        </p>
      </div>
    </div>
  );
}
