#!/usr/bin/env bash
# Comprueba que PubliTours responde de verdad (no solo que el servidor esté encendido):
#   1. la página principal carga,
#   2. /salud dice que el backend y la base de datos funcionan,
#   3. la API devuelve datos del catálogo.
# Reintenta antes de dar la alarma (una falla aislada de red no es una caída). Código de salida: 0 = todo bien, 1 = algo falla.
# Lo usa .github/workflows/vigilancia.yml cada 10 minutos; también sirve a mano:  bash scripts/vigilar-sitio.sh
#   SITIO_URL  dirección a vigilar (por defecto la de producción)   INTENTOS  veces que prueba (3)   ESPERA  segundos entre intentos (20)
set -u
SITIO_URL="${SITIO_URL:-https://djstevenmix.online}"
SITIO_URL="${SITIO_URL%/}"
INTENTOS="${INTENTOS:-3}"
ESPERA="${ESPERA:-20}"
LENTO_MS="${LENTO_MS:-5000}" # más lento que esto se avisa, pero no se considera caída

pedir() { # $1 = ruta, $2 = archivo donde guardar el cuerpo; imprime "codigo milisegundos"
  curl -s -o "$2" --max-time 20 -w "%{http_code} %{time_total}" "$SITIO_URL$1" 2>/dev/null | awk '{printf "%s %d", $1, $2 * 1000}'
}

revisar() {
  local cuerpo; cuerpo="$(mktemp)"
  local r codigo ms fallos=""

  r=$(pedir "/" "$cuerpo"); codigo=${r% *}; ms=${r#* }
  if [ "$codigo" != "200" ] || ! grep -q 'id="root"' "$cuerpo"; then fallos="$fallos\n  - la página principal no carga (HTTP $codigo)"; fi
  [ "${ms:-0}" -gt "$LENTO_MS" ] && echo "AVISO: la página principal tardó ${ms} ms"

  r=$(pedir "/salud" "$cuerpo"); codigo=${r% *}; ms=${r#* }
  if [ "$codigo" != "200" ] || ! grep -q '"base_de_datos":"ok"' "$cuerpo"; then fallos="$fallos\n  - /salud no confirma el backend y la base de datos (HTTP $codigo): $(head -c 200 "$cuerpo")"; fi

  r=$(pedir "/api/v1/sitios?limit=1" "$cuerpo"); codigo=${r% *}; ms=${r#* }
  if [ "$codigo" != "200" ] || ! grep -q '"resultados"' "$cuerpo"; then fallos="$fallos\n  - la API del catálogo no responde bien (HTTP $codigo)"; fi
  [ "${ms:-0}" -gt "$LENTO_MS" ] && echo "AVISO: la API tardó ${ms} ms"

  rm -f "$cuerpo"
  if [ -n "$fallos" ]; then printf "%b\n" "$fallos"; return 1; fi
  return 0
}

for intento in $(seq 1 "$INTENTOS"); do
  if resultado=$(revisar); then
    [ -n "$resultado" ] && echo "$resultado"
    echo "OK: $SITIO_URL responde (intento $intento de $INTENTOS)"
    exit 0
  fi
  echo "Intento $intento de $INTENTOS falló:$resultado"
  [ "$intento" -lt "$INTENTOS" ] && sleep "$ESPERA"
done
echo "FALLO: $SITIO_URL no responde correctamente tras $INTENTOS intentos."
exit 1
