# PubliTours — Frontend

Interfaz web de PubliTours ("Caquetá Vive IA"): React 19 · Vite · Tailwind 4 · React Router 7 · Leaflet. Consume la API REST del [backend](../backend). La puesta en marcha general, Docker y la seguridad están en el [README de la raíz](../README.md).

## Cómo ejecutar

```bash
npm install
cp .env.example .env   # VITE_API_ORIGIN (por defecto http://localhost:4000)
npm run dev            # http://localhost:5173 (necesita el backend en marcha)
```

| Comando | Qué hace |
|---|---|
| `npm run dev` / `build` / `preview` | Desarrollo, compilación y vista previa. |
| `npm test` | Pruebas unitarias y de componentes (Vitest + Testing Library). |
| `npm run test:e2e` | Recorridos completos con Playwright (Chrome instalado; levanta su propio backend y frontend con una base de pruebas). |
| `npm run lint` | `oxlint`. |

## Estructura

```
src/
  api/client.js        # Único punto de contacto con la API: cookie de sesión HttpOnly, cabecera anti-CSRF,
                       #   manejo de 401 (evento "sesión expirada") y descarga de archivos
  context/             # Estado global: AuthContext (sesión) y FavoritosContext
  hooks/               # Lógica reutilizable de las pantallas: useConsulta (carga con "cargando" derivado),
                       #   useConfiguracion, useBusquedaSitios, useGeneradorItinerario, useMisReservas, …
                       #   Mensajes: usePolling (repite solo con la pestaña visible), useConsultaViva, useHilo, useMensajesSinLeer
  pages/               # Una por ruta; arman la pantalla con componentes y hooks
  components/          # Piezas de interfaz, agrupadas por módulo:
    auth/              #   estructura y botón de las pantallas de acceso (LayoutAuth, MarcaAuth, BotonAuth)
    buscar/ sitio/ itinerario/ reservas/ perfil/ mapa/   # catálogo y viaje del turista
    mensajes/          #   conversaciones con negocios: lista, hilo, redactor con fotos, reportar, "Preguntar al negocio"
    prestador/         #   portal del prestador (reservas, calendario, escáner QR, paquetes, estadísticas…)
    admin/             #   portal del administrador (usuarios, moderación, auditoría, tendencias)
  utils/               # Funciones puras: fechas, moneda, calendario (.ics), qr, políticas de cancelación, …
  constants.js         # Listas y valores compartidos (municipios, categorías, versión de términos)
e2e/                   # Pruebas de punta a punta (Playwright)
```

Reglas de la carpeta: las **páginas** no llaman a `fetch` (solo a `api.*`), la lógica que se repite entre pantallas vive en **hooks** o **utils**, y el formato de pesos y fechas va en `utils/moneda.js` y `utils/fechas.js` (algunas pantallas antiguas todavía formatean cantidades con `toLocaleString("es-CO")` directamente; al tocarlas conviene pasarlas a `utils`). Las cifras del modelo de negocio (comisión, plazos de cancelación) nunca se escriben a mano: se leen de `GET /configuracion` con `useConfiguracion`.

## Rutas

| Ruta | Pantalla | Acceso |
|---|---|---|
| `/`, `/explorar` | Inicio y catálogo con filtros | Público |
| `/sitios/:id`, `/paquetes`, `/paquetes/:id`, `/negocios/:id` | Detalle de servicios, paquetes y negocios | Público |
| `/plan/:token` | Itinerario compartido (solo lectura) | Público, con el enlace |
| `/verificar/:codigo` | Verificación de un comprobante | Público |
| `/ayuda`, `/terminos`, `/privacidad`, `/conviertete-en-prestador` | Información | Público |
| `/login`, `/registro`, `/olvide-password` | Acceso | Público |
| `/comprobante/:id` | Comprobante con QR | Con sesión (quien puede ver esa reserva) |
| `/itinerario`, `/mis-reservas`, `/perfil` | Viaje y cuenta | Turista o prestador |
| `/mensajes`, `/mensajes/:id` | Bandeja y conversación con negocios y clientes | Turista o prestador |
| `/mi-negocio` | Portal del prestador | Prestador |
| `/admin` | Portal del administrador | Administrador |

Las páginas pesadas (`/itinerario`, `/mensajes`, `/mis-reservas`, `/perfil`, `/mi-negocio`, `/admin`) se cargan bajo demanda (`React.lazy`).

## Pruebas

- **Vitest** (`src/**/*.test.*`): utilidades, hooks, componentes y páginas con la API simulada.
- **Playwright** (`e2e/flujo-completo.spec.js`): un recorrido en serie con prestador, administrador y turistas (reservas, paquetes, moderación, sesión por cookie, enlace público del itinerario, escáner QR con una cámara de prueba de Chrome…). Los casos dependen unos de otros: se ejecuta la suite completa.
