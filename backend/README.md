# PubliTours — Backend

API REST de PubliTours ("Caquetá Vive IA"): Node.js 22+ · Express 4 · Sequelize 6 · PostgreSQL. La puesta en marcha, el despliegue con Docker, las reglas de negocio y la seguridad están en el [README de la raíz](../README.md); este documento explica **cómo está organizado el código** y cómo ampliarlo.

## Arquitectura en capas

Una petición recorre siempre el mismo camino, y cada capa solo conoce a la de abajo:

```
Cliente → app.js (seguridad, registro, errores) → routes → middlewares → controllers → services → (politicas) → models → PostgreSQL
```

| Capa | Carpeta | Responsabilidad | No debe |
|---|---|---|---|
| **Rutas** | `src/routes/` | Declarar endpoints y encadenar middlewares (`requireAuth`, `requireRole`, `validate`, límites). | Contener lógica. |
| **Middlewares** | `src/middlewares/` | Preocupaciones transversales: autenticación y permisos (`auth.js`), validación con zod (`validate.js`), ids de ruta (`parametros.js`), subida de archivos (`upload.js`), límites de peticiones (`limites.js`, `limitarIA.js`), identificador y registro de peticiones (`registro.js`). | Conocer reglas de negocio. |
| **Controladores** | `src/controllers/` | Capa HTTP: leer `req`, llamar a **un** servicio y dar forma a la respuesta (estado, JSON, cookies, cabeceras). | Acceder a modelos, armar errores a mano ni tener `try/catch` (salvo traducir un fallo externo). |
| **Políticas** | `src/politicas/` | **Quién puede hacer qué con cada recurso** (la propiedad: "¿es tuyo?"). Funciones puras (`puedeEditarServicio`, `puedeVerReserva`…) y su versión `exigir…`, que lanza el `ErrorHttp` que la API ya usaba. Los servicios cargan los datos y le preguntan a la política: no comparan ids ni roles por su cuenta. | Consultar la base ni conocer `req`/`res`. |
| **Servicios** | `src/services/` | Reglas de negocio y acceso a datos; los permisos por recurso los consultan a `politicas/`. Lanzan `ErrorHttp(estado, mensaje)` cuando algo no se puede hacer. | Conocer `req`/`res`. |
| **Modelos** | `src/models/` | Definición de tablas y relaciones (Sequelize). `models/index.js` declara todas las asociaciones. | Lógica de negocio. |
| **Validadores** | `src/validators/schemas.js` | Esquemas zod de toda entrada (cuerpo y query). | — |
| **Configuración** | `src/config/` | `entorno.js` (validación del entorno y CORS), `negocio.js` (comisión y políticas de cancelación: **un solo lugar** para los números), `terminos.js`, `database.js`. | — |
| **Utilidades** | `src/utils/` | Piezas sin estado: `errores.js` (`ErrorHttp`), `fechas.js`, `sesion.js` (cookie de sesión), `archivos.js` (imágenes subidas), `logger.js`, `csv.js`, `periodo.js`. | — |

### Errores

Los servicios lanzan `new ErrorHttp(estado, mensaje[, extra])` y el manejador central de `app.js` lo convierte en `{ error, ...extra }` con ese estado. Los fallos de `multer` y los JSON mal formados dan `400`; cualquier otro error da un `500` genérico con un `id` de petición que permite encontrar el detalle en los registros (nunca se devuelve el mensaje interno). Los controladores **no** responden errores a mano.

### Autorización: dos capas

1. **Rol y sesión, en la ruta** (`middlewares/auth.js`: `requireAuth`, `requireRole`, `requireCorreoVerificado`). Toda la tabla de rutas está en `tests/matriz-permisos.js`.
2. **Propiedad del recurso, en las políticas** (`src/politicas/`): `catalogo` (servicios y paquetes), `reservas`, `itinerarios`, `notificaciones`, `negocios` (perfil y reseñas), `cuentas` y `mensajes` (conversaciones: solo sus dos partes; el negocio solo responde; la administración solo ve lo reportado).

Regla de producto: **el catálogo lo gestiona solo el prestador** que lo publicó. El administrador verifica negocios y modera (ocultar o volver a publicar, por `/admin`), pero no crea, edita ni borra servicios. Un servicio se publica siempre a nombre del negocio de quien lo crea, y solo si ese negocio está aprobado (RN-01).

Para una regla nueva de permisos: agrega la función a la política que corresponda (con su `exigir…`), llámala desde el servicio y cúbrela en `tests/politicas.test.js`. El estado y el mensaje de error de cada política se conservan tal como los esperan el frontend y las pruebas.

### Servicios por área

| Área | Servicios |
|---|---|
| Cuentas | `authService` (registro, sesión, contraseñas), `verificacionService` (código de correo), `cuentaService` (descargar y eliminar datos), `emailService` |
| Catálogo | `catalogoService` (búsqueda, detalle, servicios), `paqueteService`, `disponibilidadService`, `precioService`, `visibilidad` (qué es público), `negocioPropio` |
| Reservas | `services/reservas/` → `gestion` (solicitar, confirmar, rechazar, cancelar, editar), `seguimiento` (recordatorios, asistencia, cierre automático), `consultas`, `comun` |
| Planificación | `itinerarioService` (scoring y enlace público), `iaService` (lenguaje natural) |
| Comunidad | `resenaService`, `favoritoService`, `notificacionService` (**único** punto que crea notificaciones), `mensajeService` (conversaciones, fotos privadas, reportes) |
| Negocios | `prestadorService`, `estadisticaPrestadorService` |
| Administración | `adminService` (usuarios, moderación, reseñas), `adminReportesService` (tendencias, anuncios), `auditoriaService`, `estadisticaService` |

### Reglas que atraviesan el código

- **Visibilidad pública** (`services/visibilidad.js`): un servicio o paquete es público solo si está activo y su negocio está aprobado con la cuenta activa. Toda consulta pública usa `sitioVisibleSql()` / `paqueteVisibleSql()`.
- **Sesión:** cookie `HttpOnly` + versión de sesión (`usuarios.token_version`); ver `utils/sesion.js`, `middlewares/auth.js` y la sección Seguridad del README de la raíz.
- **Esquema de la base:** solo con migraciones (`migrations/`), nunca con `sequelize.sync()`.
- **Concurrencia:** la confirmación de una reserva bloquea la fila y vuelve a comprobar el cupo en la misma transacción; los recordatorios se "reclaman" con un `UPDATE` condicional para no duplicarse.

## Cómo agregar una funcionalidad

1. **Migración** si cambia la base: `npx sequelize-cli migration:generate --name ...` (y el modelo en `src/models/`).
2. **Esquema zod** de la entrada en `validators/schemas.js`.
3. **Servicio** con la regla (lanza `ErrorHttp`; sin `req`/`res`).
4. **Controlador** delgado que llama al servicio.
5. **Ruta** con `requireAuth`/`requireRole` y `validate(...)`.
6. **Pruebas** en `tests/` (ver abajo). Si hay ids en la ruta, `validarIds(router, "id")` ya está activo en cada router.

## Scripts

| Comando | Qué hace |
|---|---|
| `npm run dev` / `npm start` | Arranca el servidor (`src/server.js`). |
| `npm run migrate` / `migrate:undo` | Aplica o revierte migraciones. |
| `npm run seed:admin -- correo "Nombre" contraseña` | Crea el primer administrador. |
| `npm run probar:correo [-- destino]` | Comprueba de verdad que Gmail acepta las credenciales de `.env` y, si das un destino, envía un correo de prueba (muestra el error real, que la aplicación esconde a propósito). |
| `NUEVA_CLAVE=… npm run cambiar:clave -- correo` | Cambia la contraseña de una cuenta (p. ej. el administrador de desarrollo) y cierra sus sesiones. La clave va en una variable de entorno, no en un argumento. |
| `npm test` | Recrea `publitours_test` con las migraciones y ejecuta todas las pruebas (`node:test` + supertest). |
| `npm run lint` | `oxlint` sobre `src`, `tests` y `migrations`. |

## Pruebas

`tests/run.js` reconstruye una base aparte (`publitours_test`) y lanza las pruebas; `tests/helpers.js` se niega a funcionar contra una base cuyo nombre no termine en `_test`, así que nunca tocan los datos de desarrollo. Ejecutar un archivo suelto con `node --test` sobre una base ya usada puede fallar por datos de pruebas anteriores: usa `npm test`.

### Mensajería

- Rutas: `/conversaciones` (`conversacionRoutes.js` → `conversacionController` → `mensajeService`) y, para la administración, `/admin/reportes-mensajes`. Tablas: `conversaciones`, `mensajes`, `mensaje_imagenes`, `reportes_mensaje` (migración `20270125000000-mensajeria.js`).
- **Fotos privadas:** `middlewares/upload.js` (`uploadImagenesMensaje`) las guarda en `public/uploads/privado/mensajes` con un nombre generado; `app.js` bloquea `/uploads/privado` *antes* del servidor de archivos y `GET /conversaciones/imagenes/:id` las entrega solo a quien puede verlas (`politicas.mensajes.puedeVerImagenMensaje`). `utils/archivos.js` solo acepta nombres con la forma que genera el servidor (nada de rutas con `../`).
- **Reglas y topes** en `config/mensajeria.js`; el frontend los lee de `GET /configuracion` → `mensajeria`.
- Borrar una cuenta borra sus conversaciones y los archivos (`mensajeService.eliminarConversacionesDe`, llamado por `cuentaService` dentro de la misma transacción); la descarga de datos las incluye (`exportarMensajes`).

### Pruebas de seguridad (patrones que se vigilan solos)

| Archivo | Qué garantiza |
|---|---|
| `permisos.test.js` + `matriz-permisos.js` | **Matriz de permisos:** las rutas se leen del código de Express (`inventario-rutas.js`) y se comparan con la tabla documentada. Una ruta nueva, una protección quitada o un rol cambiado hace fallar la prueba hasta que se actualice la tabla *a propósito*. Además ataca cada ruta protegida: sin sesión (401), con token o cookie falsos (401), con el rol equivocado (403), sin correo verificado (403) y subiendo archivos sin sesión (no se guarda nada). Toda ruta pública debe tener su motivo escrito. |
| `permisos-recursos.test.js` | **Acceso cruzado (IDOR):** una cuenta con el rol correcto no puede ver ni tocar lo de otra (reservas, itinerarios, notificaciones, servicios, paquetes, perfil del negocio, reseñas). Cada ataque exige un 4xx *y* que el dato siga igual en la base. |
| `mensajeria.test.js` | **Mensajería:** quién abre y quién responde (el negocio nunca escribe primero), temas válidos, correo verificado, topes por hora y por día, fotos privadas (solo las partes; ni por `/uploads`; archivos disfrazados, de más de 5 MB o de más de 3 se rechazan sin dejar huérfanos), lo leído y lo no leído, avisos por racha sin copiar el mensaje, reportes y moderación, y el borrado/descarga de datos. |
| `campos-sensibles.test.js` | **Control de salida:** recorre todas las rutas `GET` con seis tipos de persona y comprueba que nunca salgan hashes, versiones de sesión ni tokens; que quien no es dueño no reciba campos internos ni correos ajenos; y que las respuestas más delicadas tengan *exactamente* los campos previstos (lista blanca). |

**Si una de estas pruebas falla:** léela como una alarma. Si cambiaste un permiso a propósito, actualiza `matriz-permisos.js`. Si agregaste una ruta pública, escribe su motivo en `MOTIVO_PUBLICA`. Si salió un campo nuevo, decide si de verdad debe ser público y, si no, quítalo de la consulta o de la lista blanca del serializador (por ejemplo `resenaPublica`).

`politicas.test.js` prueba cada política por separado y la regla RN-01 (un negocio sin aprobar no publica, ni omitiendo `prestador_id`).

**Seguro por defecto:** `SitioTuristico` y `Paquete` no cargan `motivo_moderacion` (el motivo con que el administrador oculta algo) en ninguna consulta, ni siquiera a través de relaciones. Las vistas del negocio dueño, de la administración y de la exportación de datos propios lo piden con `.unscoped()`.

Cada archivo cubre un área (`sesiones`, `visibilidad`, `subidas`, `cookie-sesion`, `itinerario-compartido`, `servicios-comunes`, …). `servicios-comunes.test.js` prueba directamente las piezas compartidas (notificaciones, limitador de IA, `negocioPropio`).
