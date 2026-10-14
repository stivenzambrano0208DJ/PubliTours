// Recorre la aplicación de Express y devuelve TODAS las rutas con su protección real: si exigen sesión, qué roles y si piden correo
// verificado. No es una lista escrita a mano: sale del código, así que una ruta nueva aparece sola (y las pruebas la revisan).
// "/^\/api\/v1\/?(?=\/|$)/i" -> "/api/v1"  (Express 4 guarda el prefijo de un router como expresión regular)
function prefijo(capa) {
  if (capa.regexp?.fast_slash) return "";
  const texto = capa.regexp.toString().replace("\\/?", "").replace("(?=\\/|$)", "$");
  const m = texto.match(/^\/\^((?:\\.|[^\\/$])*)\$\//);
  if (!m) throw new Error(`No se pudo leer el prefijo de un router: ${texto}`);
  return m[1].replace(/\\(.)/g, "$1");
}

function recorrer(pila, base, heredado, salida) {
  const aqui = { ...heredado }; // lo que protege a todo lo que viene después en este router
  for (const capa of pila) {
    if (capa.route) {
      const estado = { ...aqui };
      for (const l of capa.route.stack) aplicar(l.handle, estado);
      for (const metodo of Object.keys(capa.route.methods)) {
        salida.push({ metodo: metodo.toUpperCase(), ruta: base + capa.route.path, sesion: estado.sesion, roles: estado.roles, correo: estado.correo });
      }
    } else if (capa.name === "router") {
      recorrer(capa.handle.stack, base + prefijo(capa), aqui, salida);
    } else {
      aplicar(capa.handle, aqui);
    }
  }
}

function aplicar(handle, estado) {
  if (handle.exigeSesion) estado.sesion = true;
  else if (handle.exigeCorreo) estado.correo = true;
  else if (handle.rolesPermitidos) estado.roles = handle.rolesPermitidos;
}

function listarRutas(app) {
  const salida = [];
  recorrer(app._router.stack, "", { sesion: false, roles: null, correo: false }, salida);
  return salida.filter((r) => r.ruta.startsWith("/api/v1")).sort((a, b) => (a.ruta + a.metodo).localeCompare(b.ruta + b.metodo));
}

// Texto corto de la protección de una ruta: "pública", "sesión", "prestador", "turista|prestador + correo verificado"…
function etiqueta(r) {
  if (!r.sesion) return "pública";
  const base = r.roles ? r.roles.join("|") : "sesión";
  return r.correo ? `${base} + correo verificado` : base;
}

module.exports = { listarRutas, etiqueta };
