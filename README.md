# PubliTours — Caquetá Vive IA

Plataforma web de turismo para el Caquetá (Colombia) — proyecto final SENA ADSO. Roles: **turista**, **prestador** y **administrador**.

- `backend/` — API REST (Node 24, Express 4, Sequelize 6, PostgreSQL). Ver [backend/README.md](backend/README.md).
- `frontend/` — SPA (React 19, Vite, Tailwind 4, Leaflet). Ver [frontend/README.md](frontend/README.md).
- `DOCUMENTACION/` — documentos del proyecto.

## Puesta en marcha

Requisitos: Node 24+, PostgreSQL 18 corriendo localmente.

```bash
# 1. Base de datos: crea una base vacía (ej. publitours) en PostgreSQL

# 2. Backend
cd backend
npm install
cp .env.example .env      # completa DB_*, JWT_SECRET (largo y aleatorio) y, opcional, EMAIL_*
npm run migrate           # crea las tablas
npm run seed:admin        # crea el usuario administrador inicial
npm run dev               # http://localhost:4000

# 3. Frontend (otra terminal)
cd frontend
npm install
cp .env.example .env      # VITE_API_ORIGIN=http://localhost:4000
npm run dev               # http://localhost:5173
```

> **¿Vas a hacer una prueba con otras personas?** Sigue primero la [guía del piloto](PILOTO.md): rotar secretos, probar el correo real, HTTPS, datos limpios y copias de seguridad.

## Despliegue con Docker

Todo el sistema (PostgreSQL + API + frontend con nginx) se levanta con un comando. Requiere Docker con Compose.

```bash
cp .env.example .env     # completa DB_PASSWORD, JWT_SECRET, CORS_ORIGIN y EMAIL_*
docker compose up -d --build
# La clave va en la variable CLAVE_ADMIN (12+ caracteres, con letras y números); así no queda en el historial de la terminal
docker compose exec -e CLAVE_ADMIN="UnaClaveLarga123" backend npm run seed:admin -- admin@midominio.com "Administrador"
```

La aplicación queda en `http://localhost:8080` (cambia `PUERTO_WEB` y `CORS_ORIGIN` para otro puerto o dominio). Cómo está armado:

- **nginx** sirve el frontend y reenvía `/api` y `/uploads` al backend: navegador, página y API comparten origen. La base de datos y el backend **no se publican** fuera de Docker.
- El backend aplica las **migraciones al arrancar** (`npm run migrate`), corre como usuario sin privilegios y se detiene con un cierre ordenado (termina las peticiones en curso y cierra la base de datos).
- Los datos viven en volúmenes (`pgdata` para PostgreSQL, `uploads` para las fotos): `docker compose down` no los borra; `docker compose down -v` **sí**.
- Para HTTPS pon delante un proxy con certificado (Caddy, Traefik, un balanceador del proveedor) que reenvíe al puerto web, y usa `https://...` en `CORS_ORIGIN`.

### Copias de seguridad

```bash
# Respaldo de la base de datos
docker compose exec -T db pg_dump -U publitours_app publitours > respaldo-$(date +%F).sql
# Restaurar en una base vacía
docker compose exec -T db psql -U publitours_app publitours < respaldo-AAAA-MM-DD.sql
# Fotos subidas
docker run --rm -v publitours_uploads:/datos -v "$PWD":/copia alpine tar czf /copia/fotos-$(date +%F).tgz -C /datos .
```

Programa el respaldo de la base (y de las fotos) en el servidor y guarda las copias **fuera** de él.

## Operación y seguridad en producción

- **Arranque seguro:** con `NODE_ENV=production` el servidor **no arranca** si `JWT_SECRET` es corto o de ejemplo, si la contraseña de la base es la de ejemplo, o si faltan `CORS_ORIGIN` y `EMAIL_USER`/`EMAIL_PASS` (sin correo configurado, los códigos de verificación se imprimirían en los registros).
- **Cabeceras de seguridad** (`helmet`) y **CORS** limitado a `CORS_ORIGIN`.
- **Límite de peticiones por IP:** 600 cada 15 minutos a toda la API y 30 cada 15 minutos al inicio de sesión, registro, recuperación y verificación de correo (`429` con mensaje en español). Detrás de un proxy hay que definir `TRUST_PROXY` o todos los usuarios compartirían la IP del proxy.
- **Salud:** `GET /salud` responde `200` si el proceso vive y la base de datos contesta (`503` si no); lo usan los `healthcheck` de Docker.
- **Registros:** una línea JSON por evento en producción (legible en desarrollo), con un identificador por petición (`X-Request-Id`) que también se devuelve en los errores `500` (`{"error": "...", "id": "..."}`) para encontrar el detalle en los registros. Nunca se registran cuerpos, cabeceras, contraseñas ni tokens, y la ruta se guarda sin la query.
- **Errores:** un JSON mal formado responde `400`; un fallo inesperado responde `500` sin revelar detalles internos.

## Integración continua

`.github/workflows/ci.yml` corre en cada push y pull request: lint y pruebas del backend (con PostgreSQL), lint, pruebas y build del frontend, las pruebas de punta a punta en Chrome y la construcción de las imágenes de Docker. Los comandos locales equivalentes son `npm run lint` y `npm test` en `backend` y `frontend`, y `npm run test:e2e` en `frontend`.

## Cuenta, términos y verificación de correo

- **Términos y privacidad:** el registro exige aceptar los [Términos](frontend/src/pages/Terminos.jsx) y la [Política de Privacidad](frontend/src/pages/Privacidad.jsx) (Ley 1581 de 2012). Se guarda la fecha y la versión aceptada (`backend/src/config/terminos.js` y `frontend/src/constants.js`; si cambian, se sube la versión). Son un documento base: conviene revisarlos con asesoría legal antes de operar. Opcional: `VITE_CONTACTO_EMAIL` muestra un correo de contacto en la política.
- **Verificación de correo:** al registrarse se envía un código de 6 dígitos (vence en 24 h, un solo uso, máximo 5 intentos, reenvío cada 60 s). Sin verificar se puede navegar, pero **reservar, calificar y enviar un negocio a revisión** exigen el correo verificado. Cambiar de correo exige verificarlo de nuevo. Los administradores no lo necesitan y las cuentas anteriores a esta función quedaron como verificadas.
- **Sin SMTP configurado** (`EMAIL_USER` vacío) el código se escribe en la consola del backend.

## Itinerarios con fechas

El turista elige la **fecha de inicio** y el **número de personas**. El presupuesto es del grupo (cada servicio cuesta su precio por persona), no se recomiendan servicios con cupo menor al grupo ni en días que el prestador bloqueó, y "Reservar todo" reserva cada día en su fecha real.

## Precios, disponibilidad y reservas

- **Precios flexibles (los define el prestador en cada servicio):** precio distinto para niños, tarifas por temporada (rango de fechas con su propio precio) y descuento por grupo (un % desde N personas). El servidor calcula siempre el total (`GET /sitios/:id/cotizar`); la pantalla solo lo muestra con su desglose. Los paquetes cobran un precio por persona.
- **Calendario de disponibilidad:** cada día aparece como libre, pocos cupos, completo, bloqueado o pasado (`GET /sitios/:id/disponibilidad?mes=AAAA-MM`, y lo mismo para paquetes). Un servicio sin capacidad definida admite una reserva confirmada por fecha; un paquete se bloquea si cualquiera de sus servicios está bloqueado ese día.
- **Editar una reserva:** el turista puede cambiar fecha, personas, niños o nota mientras esté pendiente o confirmada; se vuelve a validar cupo y se recalcula el total. El prestador recibe aviso por correo.
- **Comprobante:** cada reserva tiene un código `PT-XXXXXX`. `/comprobante/:id` muestra el comprobante con QR y se imprime o guarda como PDF desde el navegador. El QR abre `/verificar/:codigo`, una verificación pública que solo muestra datos mínimos y nunca presenta como válida una reserva pendiente.
- **Recordatorios:** un día antes del servicio se envía un correo al turista, una sola vez por reserva (tarea cada hora en `server.js`).

## Filtros de búsqueda

En Explorar se combinan con los demás filtros y la búsqueda por texto: **calificación mínima** (3, 4 o 4.5), **disponible el** una fecha (excluye días bloqueados y con el cupo lleno) y el orden **mejor calificados**. Valores inválidos o fechas pasadas se ignoran.

## Modelo de ingresos: comisión estimada

PubliTours es un intermediario: el pago se acuerda entre turista y prestador y **no pasa por la plataforma**. El modelo prevé una **comisión** sobre cada reserva aceptada, hoy solo como **estimación** (no se cobra):

- El porcentaje vive en un solo lugar: `backend/src/config/negocio.js` (10 % por defecto; se cambia con `COMISION_PORCENTAJE` en `backend/.env`, entre 0 y 50). La página y los Términos lo leen de `GET /configuracion`, así nunca se contradicen.
- Se **congela al confirmar** la reserva (`reservas.comision_pct` y `reservas.comision`): cambiar el porcentaje después no reescribe lo ya confirmado. Si el turista modifica una reserva confirmada, vuelve a pendiente y la comisión se recalcula cuando se confirme de nuevo. Rechazar o cancelar no genera comisión.
- El prestador ve **comisión estimada y neto** en sus estadísticas y en el CSV; el administrador ve la **comisión estimada total y por mes** en Tendencias.
- Si algún día se empieza a cobrar, hay que avisar y pedir aceptar nuevos Términos (subir `VERSION_TERMINOS`).

## Asistencia y cierre de reservas

Una reserva confirmada **no se da por cumplida sola el día siguiente**: el prestador registra qué pasó.

- Desde el día del servicio, en "Reservas recibidas" aparecen **Asistió** y **No asistió** (`PATCH /reservas/:id/asistencia`). El registro es **definitivo** y solo vale para reservas confirmadas.
  - **Asistió → completada:** cuenta como ingreso y genera comisión; el turista recibe el aviso y ya puede calificar.
  - **No asistió → no_asistio:** no cuenta como ingreso, se borra su comisión estimada, no permite reseña y el turista recibe un aviso que le indica contactar al negocio si fue un error.
- **Plazo de gracia:** si el prestador no registra nada en `DIAS_GRACIA_ASISTENCIA` días (3, en `backend/src/config/negocio.js`), la tarea horaria completa la reserva sola y la marca como `cierre_automatico`, para que un descuido del prestador no le quite al turista la posibilidad de calificar. Al día siguiente del servicio se le recuerda **una sola vez** al prestador que la registre.
- **Reseñas:** solo de reservas **completadas**. Mientras el prestador no registra la asistencia (o no se cumple el plazo), el turista ve "El prestador está registrando tu asistencia".
- **Estadísticas:** las no asistidas no suman ingresos ni comisión; la **tasa de no asistencia** (porcentaje de las ya cerradas) y la de aceptación (que sí cuenta a quien no asistió, porque el prestador lo aceptó) se calculan con las reservas reales. Las tendencias del administrador tampoco las cuentan como valor aceptado.
- Si el prestador y el cierre automático coinciden, gana el que llega primero (la reserva se bloquea en una transacción) y el turista recibe un único aviso.
- Límite conocido: no existe todavía una disputa dentro de la app; el turista que discrepa debe comunicarse con el negocio.

## Política de cancelación

Cada servicio y paquete tiene una política que elige el prestador (por defecto **flexible**). Define con cuántos días de antelación se puede cancelar una reserva confirmada sin que cuente como **tardía**; los plazos viven en `backend/src/config/negocio.js` y se publican en `GET /configuracion`, de donde los leen las pantallas:

| Política | Gratis hasta |
|---|---|
| Flexible | 1 día antes (el comportamiento de siempre) |
| Moderada | 3 días antes |
| Estricta | 7 días antes |

- El turista **siempre puede cancelar hasta el día anterior**. Si lo hace con menos antelación que la política, la reserva queda marcada como **cancelación tardía** y el prestador lo ve (en su lista, en la notificación y en sus estadísticas). Hoy no hay cargo: la marca existe para que, cuando haya pagos, decida el reembolso.
- Una solicitud **pendiente** nunca es tardía: el prestador aún no se había comprometido.
- La política se ve **antes de reservar** (detalle del servicio y del paquete) y en el comprobante. Al cancelar una confirmada fuera de plazo, la pantalla avisa antes de confirmar.
- Cada reserva **conserva la política con la que se hizo** (`reservas.politica_cancelacion`): si el prestador la cambia después, no afecta a las ya hechas.

## Panel del prestador: calendario y estadísticas

- **Calendario de reservas:** en "Reservas recibidas" se alterna entre lista y calendario mensual. Cada día muestra cuántas reservas están pendientes y cuántas confirmadas; al elegir un día se ven sus detalles. Las rechazadas y canceladas no ocupan el día.
- **Atender con QR:** el botón «Escanear QR» de "Reservas recibidas" abre la cámara, lee el QR del comprobante del turista y muestra su reserva (turista, servicio, fecha, personas, estado). Si está confirmada y es el día del servicio (o ya pasó), «Asistió» / «No asistió» registra la asistencia con las mismas reglas de siempre (lo vuelve a comprobar el servidor). Si la reserva está pendiente, cancelada, rechazada, ya registrada o es de otro negocio, lo explica y no deja registrar nada. Sin cámara o sin permiso, el código se puede escribir a mano (`PT-AB12CD`). No usa el servidor: busca entre las reservas del propio negocio. **La cámara solo funciona con HTTPS** (o en `localhost`); la lectura usa la librería `jsqr`.
- **Estadísticas por periodo** (`GET /prestadores/me/estadisticas?desde=&hasta=`, por defecto los últimos 6 meses hasta fin del mes actual; máximo 2 años): solicitudes, aceptadas, ingresos (solo confirmadas y completadas), ticket promedio, tasa de aceptación, gráficas por mes y qué servicio o paquete vende más. Todo se calcula en el servidor con las reservas reales; sin datos no se inventan porcentajes.
- **Exportar CSV** (`/prestadores/me/estadisticas.csv`): una fila por reserva, separado por `;` y con tildes para Excel en español. No incluye datos del turista y neutraliza textos que Excel leería como fórmula.

## Itinerario: guardar PDF y compartir

En el resultado del itinerario, **Guardar PDF** abre la impresión del navegador con una versión limpia (días, actividades, precios por grupo y total) y **Compartir** usa el menú del dispositivo o, si no existe, copia el plan como texto.

**Enlace público de solo lectura.** «Crear enlace para compartir» genera una dirección `/plan/<token>` (token aleatorio de 24 caracteres) que cualquiera puede abrir sin cuenta. Muestra solo el plan (días, actividades, precios del grupo y total): **no** incluye quién lo armó, su presupuesto ni ningún dato personal, y solo lista servicios que hoy son públicos (si un negocio se suspende o un servicio se oculta, desaparece del plan). La página pide no ser indexada (`noindex`) y no se guarda en cachés. «Dejar de compartir» revoca el enlace al instante; volver a compartir crea una dirección nueva. Compartir dos veces seguidas devuelve la misma dirección. API: `POST /itinerarios/:id/compartir`, `DELETE /itinerarios/:id/compartir` (solo el dueño) y `GET /itinerarios/compartido/:token` (público).

## Mensajes entre turistas y negocios

Una turista puede **preguntarle al negocio antes de reservar** (botón «Preguntar al negocio» en cada servicio y paquete, y «Escribir al negocio» en sus reservas). Las conversaciones están en `/mensajes`, con un contador junto a la campana.

- **Quién escribe:** la conversación la abre siempre quien pregunta (una turista, o un prestador que pregunta a *otro* negocio como lo haría un turista). **El negocio solo responde**: no existe ninguna ruta para que escriba primero a alguien, ni para escribirse a sí mismo. Escribir exige el **correo verificado**.
- **Una conversación por pareja** (turista, negocio). Cada mensaje puede llevar el servicio, paquete o reserva sobre el que se pregunta; ese tema sale siempre del servidor, no de un id que mande el cliente.
- **Fotos:** hasta 3 por mensaje, de 5 MB, JPG/PNG/WEBP/GIF (se comprueba el contenido real, no solo la extensión). Son **privadas**: viven en `public/uploads/privado/mensajes` (dentro del volumen de `uploads`, así que entran en los respaldos), la ruta pública `/uploads/privado` está bloqueada y solo se entregan por `GET /conversaciones/imagenes/:id`, que comprueba que quien pide participa en la conversación (con cabeceras `private, no-store`, `nosniff` y CSP `sandbox`).
- **Quién ve qué:** solo las dos partes. La administración **no lee conversaciones**: únicamente ve el mensaje concreto (y sus fotos) que alguien reporta.
- **Reportar y moderar:** cualquiera de las partes reporta un mensaje de la otra (spam, ofensivo, datos o pagos sospechosos, estafa, otro). En el panel del administrador, pestaña «Mensajes reportados», se **descarta** (queda como estaba) o se **retira** (nadie vuelve a ver su texto ni sus fotos y su autor recibe un aviso). Queda en el historial de auditoría.
- **Topes contra el abuso** (en `backend/src/config/mensajeria.js`, y el frontend los lee de `GET /configuracion`): 1500 caracteres por mensaje, 60 mensajes por hora y 10 negocios nuevos por día por persona. Un negocio suspendido o sin aprobar no recibe conversaciones nuevas.
- **Avisos:** se avisa por la campana y por correo **una vez por racha** de mensajes sin leer, y el aviso **no copia el contenido** del mensaje.
- **Tus datos:** la descarga de datos incluye tus conversaciones (de las fotos, solo cuántas hay) y **eliminar la cuenta borra** todas sus conversaciones, mensajes y fotos (también las de un negocio cuando se elimina la cuenta de su dueño).
- **Actualización:** el hilo abierto se actualiza solo cada 5 s, la bandeja cada 15 s y el contador cada 30 s, y **solo mientras la pestaña está a la vista** (no hay conexiones permanentes). No hay cifrado de extremo a extremo: el servidor guarda los mensajes tal cual, y por eso los términos y la política de privacidad lo explican.

## Calendario y ayuda

- **Agregar al calendario:** una reserva confirmada y futura se descarga como archivo `.ics` (evento de día completo con el código del comprobante y un recordatorio un día antes). Se genera en el navegador; no pasa por el servidor.
- **Preguntas frecuentes** (`/ayuda`, enlazada desde el pie de página): cómo reservar, cancelar, calificar, publicar un negocio, etc. Las cifras (plazos de cancelación, días de gracia, comisión) se leen de `GET /configuracion`, así que nunca contradicen las reglas reales.

## Herramientas del administrador

- **Tendencias:** registros nuevos de turistas y prestadores, solicitudes, aceptadas y valor aceptado por mes, con gráficas y CSV (`/admin/tendencias`, `/admin/tendencias.csv`). Solo agregados, nunca datos de personas.
- **Historial de acciones** (`/admin/auditoria`): quién aprobó o rechazó un negocio, suspendió o reactivó una cuenta, ocultó o publicó un servicio o paquete, retiró una reseña o envió un anuncio, con fecha y detalle. Solo se registra lo que se completó.
- **Anuncios** (`POST /admin/anuncios`): mensaje de 10 a 500 caracteres a los negocios aprobados o a todos; les llega a la campana de notificaciones.

## Tus datos y tu cuenta

En **Perfil → Mis datos** (turista y prestador):

- **Descargar mis datos:** archivo JSON con la cuenta, reservas, reseñas, favoritos, itinerarios y notificaciones (y el negocio, servicios y paquetes si es prestador). Nunca incluye contraseñas (`GET /auth/mis-datos`).
- **Eliminar mi cuenta:** pide la contraseña y no se permite con reservas pendientes o próximas (propias o, en un negocio, recibidas). La cuenta se **anonimiza** (nombre "Cuenta eliminada", correo inutilizable, sin acceso) en lugar de borrar la fila, para no romper el historial de reservas de otras personas; se borran favoritos, itinerarios, notificaciones, códigos y las notas de sus reservas. Los servicios y paquetes del negocio se archivan y sus datos de contacto se borran. Las cuentas de administrador no se eliminan desde la app. El correo original queda libre para registrarse de nuevo.

## Página pública del negocio

`/negocios/:id` muestra contacto (WhatsApp, redes, dirección), servicios, paquetes y reseñas de un negocio aprobado. Se llega desde el detalle de un servicio o de un paquete.

## Registro de prestadores (en dos etapas)

1. **Al registrarse** el prestador deja solo lo básico de su negocio: nombre, categoría y municipio. La cuenta y el perfil se crean juntos y el perfil nace **incompleto**.
2. **En su portal** completa el resto: descripción (mín. 30 caracteres), WhatsApp, dirección o cómo llegar y, opcionalmente, redes. Puede guardar borradores; el botón "Enviar a revisión" se habilita cuando todo está completo.
3. **Al enviarlo** pasa a **pendiente** y los administradores reciben una notificación. Hasta ese momento el negocio no aparece en la cola de revisión ni puede ser aprobado.
4. El administrador lo **aprueba o lo rechaza con motivo**; si lo rechaza, el prestador corrige y lo reenvía. Solo un negocio aprobado puede publicar servicios y paquetes.

## Paquetes turísticos

Un prestador puede combinar **varios de sus servicios** (por ejemplo hospedaje + cabalgata + almuerzo) en un paquete con **precio propio por persona**. El turista lo reserva en **una sola solicitud**.

- Solo se incluyen servicios propios y activos (mínimo 2). El prestador define el día de cada servicio, el precio por persona y, opcionalmente, los cupos por día.
- La reserva usa el precio del paquete y el prestador la confirma una sola vez. Un día bloqueado en cualquiera de los servicios bloquea el paquete.
- Un servicio que está dentro de un paquete vigente no se puede eliminar; si se pausa, el paquete deja de mostrarse.
- Pantallas: `/paquetes` y `/paquetes/:id` (públicas) y la sección **Mis paquetes** del Portal del Prestador.
- **Reseñas:** los paquetes se califican igual que los servicios (reserva cumplida, una reseña por reserva); el promedio sale en el listado y en el detalle, y el prestador puede responder. Las reseñas de un paquete no cuentan para sus servicios.
- **Fotos:** el prestador puede subir una portada propia y una **galería de hasta 8 fotos** (se gestionan desde el formulario del paquete; al editar se suben y borran al instante). La página del paquete muestra un collage con la portada, la galería y las fotos de los servicios incluidos, con visor a pantalla completa.
- **Moderación:** el administrador puede ocultar un paquete (o un servicio) con un motivo desde su panel. El estado "oculto" lo pone solo el administrador: el prestador ve el motivo y no puede reactivarlo ni pausándolo ni editándolo.

## IA: itinerarios en lenguaje natural

En **Itinerario IA** el turista puede escribir algo como *"viaje romántico de 3 días en Florencia con 500 mil pesos"*. El sistema entiende presupuesto, días, intereses y municipio, rellena el formulario y el turista revisa antes de generar.

- La IA (Claude) **solo interpreta** el mensaje. Los sitios los elige siempre el motor de scoring sobre el catálogo verificado, así que nunca se inventa un lugar.
- Con `ANTHROPIC_API_KEY` en `backend/.env` usa Claude (modelo `claude-haiku-4-5`, configurable con `IA_MODELO`). Sin clave, o si la IA falla, usa una **interpretación básica por reglas** con el mismo resultado de formato; la pantalla indica cuál se usó.
- Límite de consultas con IA por usuario: 20 por hora (`IA_LIMITE_POR_HORA`).
- La clave se crea en https://console.anthropic.com. Nunca la pegues en un chat ni la subas al repositorio.

## Pruebas

```bash
# Backend (API + reglas de negocio, contra una base real de pruebas)
cd backend
npm test

# Frontend (componentes con Vitest + Testing Library)
cd frontend
npm test

# Punta a punta (navegador real con Playwright)
cd frontend
npm run test:e2e
```

- **Backend:** usa una base aparte (`publitours_test`, debe existir) y la reconstruye con las migraciones en cada ejecución. Cubre autenticación, roles, administración (historial, tendencias, anuncios), estadísticas del prestador, eliminación de cuenta, concurrencia al confirmar reservas, reservas (cupos, fechas bloqueadas, cancelación, completadas, edición, tarifas, comprobante y recordatorios), filtros de búsqueda, reseñas, favoritos, administración, búsqueda por cercanía y recuperación de contraseña.
- **Frontend:** no necesita backend; la API se simula. Cubre estrellas, formulario de reserva (con tarifas y calendario), comprobante, calendario y estadísticas del prestador, herramientas de admin, itinerario exportable, privacidad de la cuenta, favoritos, notificaciones, calificación y edición de perfil.

- **Punta a punta:** abre Google Chrome (debe estar instalado) y recorre el flujo completo con tres sesiones a la vez: el prestador se registra y crea su negocio, el administrador lo aprueba, el prestador publica un servicio con cupos, el turista lo reserva, el prestador recibe la alerta y confirma, el turista cancela una segunda reserva, la reserva se completa y se califica, el prestador responde la reseña y el administrador suspende al turista. Levanta su propio backend (puerto 4100) y frontend (puerto 5174) y usa la base `publitours_test` (se reconstruye en cada ejecución; configurable con `E2E_DB_NAME`), por lo que no toca tus datos de desarrollo. `npm run test:e2e:ui` abre el modo visual de Playwright y, si falla, `npx playwright show-report` muestra capturas y trazas.

## Seguridad

- **Fotos de las conversaciones:** privadas por diseño (carpeta no pública + ruta con permisos; ver «Mensajes entre turistas y negocios»). Al elegir un archivo para subir, el servidor exige sesión y rol *antes* de recibirlo, comprueba su contenido real y borra lo subido si la petición falla.
- **Sesión del navegador:** vive en una cookie `HttpOnly` (`publitours_sesion`, `SameSite=Lax`, `Secure` cuando la petición llega por HTTPS): ningún script de la página puede leerla. Como el navegador la envía sola, toda petición que cambia datos debe traer además la cabecera `X-Requested-With: PubliTours` (defensa CSRF; el frontend la pone en cada llamada). La API sigue aceptando `Authorization: Bearer` para clientes que no son un navegador (en ese caso no hace falta la cabecera). `POST /auth/logout` borra la cookie. Detrás de un proxy con HTTPS, configura `TRUST_PROXY` y que el proxy envíe `X-Forwarded-Proto` para que la cookie salga con `Secure`.
- Nunca subas `.env` (ya está en `.gitignore`); usa los `.env.example` como plantilla.
- Si una credencial se expuso (contraseña de aplicación de Gmail, `JWT_SECRET`, contraseña de la BD), revócala y genera una nueva.
- Los cambios de esquema se hacen con migraciones (`npx sequelize-cli migration:generate --name ...`), nunca con `sequelize.sync()`.
