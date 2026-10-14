# Seguridad de PubliTours

Este documento describe qué protege el sistema, cómo se comprueba y cómo informar de un problema. Solo afirma lo que el código y las pruebas del repositorio respaldan.

## Cómo informar de una vulnerabilidad

Escribe a la persona responsable del proyecto (dato por completar antes del piloto: correo de contacto de seguridad) con lo que encontraste y cómo reproducirlo. No publiques el problema ni uses datos de otras personas para probarlo.

## Qué está protegido

| Área | Medida |
|---|---|
| Sesión | JWT en cookie `HttpOnly`, `SameSite=Lax` y `Secure` cuando la conexión es HTTPS. `token_version` invalida sesiones al cambiar la contraseña. |
| CSRF | Las peticiones con cookie que cambian datos exigen la cabecera `X-Requested-With: PubliTours`. |
| Permisos | Tres niveles: rol (`requireRole`), correo verificado y propiedad del recurso (`src/politicas/`). La matriz de permisos se lee del código y una prueba falla si una ruta nueva no está declarada. |
| Datos entre cuentas | Pruebas de acceso cruzado (`permisos-recursos.test.js`): una cuenta no ve ni modifica reservas, itinerarios, notificaciones, servicios ni conversaciones de otra. |
| Campos internos | `motivo_moderacion` y otros campos privados no salen en vistas públicas (`campos-sensibles.test.js`). |
| Fotos | Se comprueba el contenido real, no la extensión. Las de conversaciones son privadas: carpeta no pública y entrega solo por una ruta con permisos. |
| Abuso | Límite general de peticiones y uno más estricto para las rutas de acceso (`middlewares/limites.js`), y topes de mensajes por hora y por día. |
| Cabeceras | `helmet` en la API. En el nginx del frontend: CSP, `X-Frame-Options`, `nosniff`, `Referrer-Policy`, `Permissions-Policy` y HSTS (este último solo cuando el visitante llega por HTTPS). Ver `frontend/nginx-seguridad.conf`. |
| Datos personales | Descarga y eliminación de la cuenta desde el perfil; política de privacidad y términos. |
| Secretos | Solo en `.env` (fuera del repositorio y de las imágenes de Docker). `scripts/crear-env.cjs` genera los secretos; `scripts/configurar-correo.cjs` pide la clave del correo con entrada oculta. |

## Cómo se comprueba

Las pruebas de seguridad se validaron alterando el código a propósito (mutaciones) para confirmar que fallan cuando la protección se rompe. Se ejecutan con `npm test` en `backend/` y forman parte del CI.

## Límites conocidos

- **HTTPS:** el sistema está preparado (cookie `Secure`, HSTS), pero necesita un dominio con certificado delante del nginx; no se ha probado en un despliegue público.
- **Mensajes sin cifrado de extremo a extremo:** el servidor los guarda tal cual; la administración solo ve los que se reportan.
- **CSP con `style-src 'unsafe-inline'`:** React y Leaflet usan estilos en línea. Los scripts sí están limitados a los propios.
- **Dependencias:** `npm audit --omit=dev` (13 oct 2026): frontend sin hallazgos; backend con 1 aviso moderado de `uuid` dentro de Sequelize (afecta a v3/v5/v6 cuando se les pasa un buffer; Sequelize usa v4 sin buffer, así que no es explotable aquí). Su arreglo automático instalaría Sequelize 3 y no se aplica; se revisa al actualizar Sequelize. No hay escaneo automático periódico.
- **Sin prueba de carga** todavía.
- **Pagos:** la plataforma no procesa pagos, por lo que no maneja datos de tarjetas.
- **Respaldos:** hay guía en `PILOTO.md`; programarlos y probar la restauración depende de quien opere el servidor.
