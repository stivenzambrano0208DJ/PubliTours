# Guía para la prueba piloto

Qué hacer **antes** de invitar a otras personas a probar PubliTours. Cada paso dice si ya quedó hecho, qué te toca a ti y qué
**no se ha podido verificar** todavía. Los comandos están para **PowerShell** (Windows) y, donde cambia, para Bash.

> **Alcance del piloto:** reservas como *solicitudes* (la plataforma no procesa pagos), con personas de confianza y datos de ejemplo
> reales (negocios reales, fotos reales). **No** es para público abierto ni para cobrar dinero.

## 0. Resumen

| # | Paso | Estado |
|---|---|---|
| 1 | Rotar la contraseña de aplicación de Gmail | **Te toca a ti** (solo tú puedes entrar a esa cuenta) |
| 2 | Secretos nuevos y clave de administrador | **Hecho:** `.env` con secretos nuevos y clave nueva del administrador de desarrollo. Te falta completar el correo en el `.env` |
| 3 | Probar el correo real | Herramienta lista y verificada (también dentro de Docker); **falta ejecutarla con tus credenciales nuevas** |
| 4 | Desplegar | **Verificado en local con Docker** (construye, migra, sirve y responde). Falta probarlo con HTTPS real |
| 5 | Datos de prueba limpios | Procedimiento listo y probado (base nueva en Docker) |
| 6 | Copia de seguridad | **Verificado:** el respaldo se hizo y se **restauró** con los mismos datos |

## 1. Rotar la contraseña de aplicación de Gmail

La anterior se mostró en una conversación: considérala comprometida.

1. Entra a tu cuenta de Google → **Seguridad** → **Verificación en dos pasos** (debe estar activa) → **Contraseñas de aplicaciones**.
2. **Elimina** la contraseña de aplicación anterior de PubliTours.
3. Crea una nueva (16 letras) y cópiala **solo** al archivo `.env` (paso 2). No la pegues en chats, correos ni capturas.

Gmail limita el envío (del orden de cientos de correos por día): suficiente para un piloto, no para operar.

## 2. Secretos y clave de administrador

**Ya hecho:**
- Se creó el `.env` de la carpeta raíz con una contraseña de base de datos y un `JWT_SECRET` **nuevos y aleatorios** (`node scripts/crear-env.cjs`;
  no se mostraron y el archivo está en `.gitignore`). Se dejó `PUERTO_WEB=8081` porque el 8080 lo usa otro proyecto en tu Docker.
- La clave `admin1234` del administrador de desarrollo (`admin@publitours.com`) **ya no sirve**: se sustituyó por una clave larga y aleatoria,
  guardada en `backend/.clave-admin-desarrollo.txt` (ignorado por git). **Pásala a un gestor de contraseñas y borra ese archivo.**

**Te toca:** abrir `.env` y completar `EMAIL_USER` (tu Gmail) y `EMAIL_PASS` (la contraseña de aplicación del paso 1). Para no escribirlo a
mano en un editor, puedes usar este comando, que pide los datos con la contraseña oculta y solo toca esas dos líneas:

```powershell
node scripts/configurar-correo.cjs
```

Para cambiar otra clave más adelante (la clave se lee de una variable de entorno para que no quede en el historial; mínimo 12 caracteres con letras y números; cierra las sesiones abiertas):

```powershell
# en backend/
$env:NUEVA_CLAVE = "una-clave-larga-y-unica-2031"; npm run cambiar:clave -- correo@ejemplo.com; Remove-Item Env:NUEVA_CLAVE
```

## 3. Probar el correo real

Importante: en la aplicación, un fallo de correo **nunca rompe la operación** (para no tumbar una reserva por un problema de correo).
Eso significa que con credenciales malas el registro "funciona" pero el código de verificación **jamás llega**. Por eso existe una herramienta
que sí muestra el error:

```powershell
# En backend/ (usa backend/.env). Solo comprueba que Gmail acepta las credenciales:
npm run probar:correo
# Además envía un correo real de prueba (revisa bandeja de entrada y spam):
npm run probar:correo -- tucorreo@ejemplo.com
# Dentro de Docker, con el .env de la carpeta raíz:
docker compose exec backend node src/scripts/probarCorreo.js tucorreo@ejemplo.com
```

**Verificado:** la herramienta distingue "faltan credenciales" y "Gmail las rechazó", tanto en tu equipo como **desde dentro del contenedor**
(esto confirma que el contenedor puede salir a Gmail). **Sin verificar:** un envío exitoso, porque requiere tus credenciales nuevas.

Después de configurar el correo, prueba también **desde la aplicación**: registrarse con un correo real (debe llegar el código de 6 dígitos)
y "Olvidé mi contraseña".

## 4. Desplegar

```powershell
# En la carpeta raíz, con Docker Desktop encendido:
docker compose up -d --build
docker compose ps                         # los tres servicios deben decir "healthy"
curl.exe http://localhost:8081/salud      # {"estado":"ok","base_de_datos":"ok"}
```

**Verificado (en un entorno temporal que ya se eliminó):** construcción de las imágenes (≈3 min la primera vez), arranque en modo producción,
las 21 migraciones sobre una base vacía, zona horaria `America/Bogota`, proceso sin permisos de administrador, nginx sirviendo la
aplicación y las rutas internas (`/ayuda`), la API detrás de nginx, registro con cookie `HttpOnly`, defensa CSRF, errores sin detalles
internos y `seed:admin`, `cambiar:clave` y `probar:correo` dentro de la imagen. Las fotos subidas **sobreviven a un reinicio** (volumen `uploads`).
En producción el arranque **falla a propósito** si faltan `JWT_SECRET`, `CORS_ORIGIN`, `EMAIL_USER` o `EMAIL_PASS`: complétalos antes.

**Sin verificar:** la integración continua de GitHub (nunca se ha ejecutado en línea) y todo lo que depende de **HTTPS real**.

**HTTPS: por qué importa.** La cookie de sesión se marca `Secure` si la petición llega por HTTPS, y el navegador solo deja usar la
cámara (escáner QR) con HTTPS o en `localhost`.

| Situación | Qué hacer |
|---|---|
| Pruebas **solo en tu computador** | `http://localhost:8081` basta: la cámara funciona en `localhost` y la cookie funciona (sin `Secure`). |
| Otras personas, **desde sus celulares** | Necesitas una dirección HTTPS pública: un túnel (por ejemplo Cloudflare Tunnel o ngrok hacia `http://localhost:8081`) o un servidor con dominio y certificado. Pon esa dirección exacta en `CORS_ORIGIN`, reinicia (`docker compose up -d`) y úsala siempre. |
| Servidor propio con dominio | Un proxy con certificado (por ejemplo Caddy o nginx con Let's Encrypt) delante del contenedor `frontend`. |

**Cookie `Secure` detrás de un proxy (corregido y verificado):** el nginx del contenedor ahora respeta el `X-Forwarded-Proto: https` que
envíe un proxy exterior (túnel o balanceador). Se comprobó: con esa cabecera la cookie sale con `Secure`; sin ella, en HTTP directo, no.
Lo que **no** se probó es un túnel real.

**Lista de comprobación tras desplegar** (anótala como resultado real, no como supuesto):
- [ ] `/salud` responde `ok` y la página carga.
- [ ] Registro con correo real → llega el código → se verifica.
- [ ] Iniciar sesión; en las herramientas del navegador la cookie `publitours_sesion` aparece `HttpOnly` (y `Secure` si hay HTTPS).
- [ ] Un prestador sube una foto de un servicio y se sigue viendo después de `docker compose restart`.
- [ ] Escáner QR en un **celular real** con un comprobante impreso.

## 5. Datos de prueba limpios

- **No uses la base de desarrollo** para el piloto. La base de Docker nace vacía y las migraciones se aplican solas al arrancar.
- Crea el administrador del piloto en esa base nueva, con **su propia clave**, distinta a la de desarrollo:

```powershell
docker compose exec backend node src/scripts/seedAdmin.js admin-piloto@ejemplo.com "Administrador Piloto" "una-clave-larga-2031"
```
  (Ese comando deja la clave en el historial del terminal; después puedes cambiarla con una variable de entorno:
  `docker compose exec -e NUEVA_CLAVE='…' backend node src/scripts/cambiarClave.js admin-piloto@ejemplo.com`. Ambos se probaron dentro de la imagen.)
- Los negocios, servicios y fotos del piloto deben ser **reales** (o de personas que aceptan aparecer): la plataforma no inventa datos y
  tú tampoco deberías para evaluarla.
- Para empezar de cero otra vez: `docker compose down -v` **borra** la base y las fotos del piloto. No lo ejecutes sin una copia (paso 6).

## 6. Copia de seguridad

Estos comandos se **ejecutaron de verdad**: el respaldo de la base se restauró en una base vacía y coincidieron usuarios, migraciones y tablas.

```powershell
# En la carpeta raíz. Base de datos: el volcado se hace DENTRO del contenedor y luego se copia el archivo.
docker compose exec -T db pg_dump -U publitours_app -f /tmp/respaldo.sql publitours
docker compose cp db:/tmp/respaldo.sql ".\respaldo-$(Get-Date -Format yyyy-MM-dd).sql"
docker compose exec -T db rm /tmp/respaldo.sql

# Fotos subidas
docker run --rm -v publitours_uploads:/datos -v "${PWD}:/copia" alpine tar czf /copia/fotos-$(Get-Date -Format yyyy-MM-dd).tgz -C /datos .
```

> **No uses `docker compose exec … pg_dump > archivo.sql` en Windows PowerShell:** la redirección `>` de PowerShell 5.1 antepone una marca
> BOM (o guarda en UTF-16) y ensucia el archivo; se comprobó. La forma de arriba (`-f` + `docker compose cp`) sale limpia.
> En Git Bash, antes de `docker run` con rutas como `/datos`, usa `MSYS_NO_PATHCONV=1` o Git Bash las reescribe.

```powershell
# Restaurar en una base vacía (primero crea la base y luego carga el archivo)
docker compose exec -T db psql -U publitours_app -d postgres -c "CREATE DATABASE restaurada"
docker compose cp .\respaldo-AAAA-MM-DD.sql db:/tmp/respaldo.sql
docker compose exec -T db psql -U publitours_app -d restaurada -q -f /tmp/respaldo.sql
```

(La restauración con `-f` desde dentro del contenedor es la variante equivalente a la probada con redirección de Bash; funciona igual.)

- Haz una copia **antes** de empezar el piloto y otra al final de cada jornada; guárdalas **fuera** del equipo donde corre.
- Las **fotos de las conversaciones** (privadas) viven dentro del mismo volumen `uploads`, así que el respaldo de fotos de arriba también las incluye. Esas fotos contienen datos de personas: guarda esa copia con el mismo cuidado que la base de datos.
- El respaldo no incluye el archivo `.env`: guarda aparte los secretos (en un gestor de contraseñas, no en el repositorio).

## Qué observar durante el piloto

- Dónde se atoran las personas (registro, verificación de correo, reservar, subir fotos).
- Si llegan los correos (y a qué carpeta).
- Cómo se ve y se siente en **celular**, que es donde más se usará.
- Cualquier error visible: anota la hora y, si la pantalla muestra un `id`, guárdalo (sirve para encontrar el detalle en los registros:
  `docker compose logs backend`).
- Lo que **les falta** a los prestadores y turistas (mensajes entre ellos, pagos…): es información para decidir qué sigue.

Lo que este piloto **no** puede decirte: cómo responde con muchos usuarios a la vez (no hay pruebas de carga) ni la seguridad frente a un
ataque real (hay pruebas automáticas de permisos y campos, pero no una prueba de intrusión).

## Despliegue con Dokploy

Usa `docker-compose.dokploy.yml` (no publica puertos y declara 2 proxies delante del backend: Traefik y nginx).

1. **DNS:** crea un registro `A` de tu dominio (y de `www`, si lo usas) hacia la IP del VPS.
2. **Proyecto:** en Dokploy crea un servicio *Compose* con origen GitHub (`stivenzambrano0208DJ/PubliTours`, rama `main`) y **Compose Path** `./docker-compose.dokploy.yml`.
3. **Variables** (pestaña *Environment*; los secretos viven solo ahí): `DB_PASSWORD`, `JWT_SECRET` (64 caracteres aleatorios), `CORS_ORIGIN=https://tu-dominio`, `EMAIL_USER`, `EMAIL_PASS` (sin correo configurado el backend **no arranca** en producción), y opcionalmente `ANTHROPIC_API_KEY`, `COMISION_PORCENTAJE`. No pongas `TRUST_PROXY` salvo que cambie la cadena de proxies.
4. **Dominio:** pestaña *Domains* → servicio `frontend`, puerto `80`, HTTPS activado (Let's Encrypt).
5. **Administrador:** tras el primer despliegue, desde la terminal del contenedor `backend`: `node src/scripts/seedAdmin.js correo "Nombre" clave`. Escribe la clave tú; no la compartas por chat.
6. **Respaldos:** programa en Dokploy el respaldo de la base y de los volúmenes `pgdata` y `uploads` hacia un almacenamiento fuera del VPS, y prueba una restauración.
