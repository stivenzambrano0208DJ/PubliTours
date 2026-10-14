// Guarda las credenciales de Gmail en el .env sin que la contraseña pase por el chat ni por el historial del terminal.
// Pide el correo y la contraseña de aplicación (la contraseña se escribe oculta) y actualiza SOLO las líneas EMAIL_USER y EMAIL_PASS.
//
// Uso (desde la carpeta raíz):  node scripts/configurar-correo.cjs
// Actualiza el .env de la raíz (el que usa docker compose) y, si quieres, también backend/.env (desarrollo).
// La contraseña es una «contraseña de aplicación» de Google (16 letras), no la clave de la cuenta.
const fs = require("node:fs");
const path = require("node:path");
const readline = require("node:readline");

const raiz = path.join(__dirname, "..");
const archivos = [{ ruta: path.join(raiz, ".env"), nombre: ".env (raíz, Docker)", obligatorio: true }, { ruta: path.join(raiz, "backend", ".env"), nombre: "backend/.env (desarrollo)" }];

const rl = readline.createInterface({ input: process.stdin, output: process.stdout, terminal: Boolean(process.stdin.isTTY) });

// Las respuestas se leen con una cola de líneas: si llegan varias juntas (entrada por tubería) no se pierde ninguna, y si la entrada se
// acaba antes de tiempo se avisa con un error en vez de terminar en silencio.
let ocultar = false;
const escribirOriginal = rl._writeToOutput?.bind(rl);
rl._writeToOutput = (texto) => {
  if (ocultar) rl.output.write(texto.includes("\n") ? "\n" : "*"); // la contraseña se muestra como asteriscos
  else if (escribirOriginal) escribirOriginal(texto);
  else rl.output.write(texto);
};
const cola = [];
let pendiente = null;
let terminada = false;
rl.on("line", (linea) => {
  if (pendiente) { const resolver = pendiente; pendiente = null; ocultar = false; resolver(linea); } else cola.push(linea);
});
rl.on("close", () => {
  terminada = true;
  if (pendiente) { const resolver = pendiente; pendiente = null; resolver(null); }
});
const preguntar = (texto, secreto = false) => new Promise((resolver) => {
  if (cola.length) { process.stdout.write(texto + "\n"); resolver(cola.shift()); return; }
  if (terminada) { resolver(null); return; }
  pendiente = resolver;
  rl.setPrompt(texto);
  rl.prompt();
  ocultar = secreto;
});
const salir = (codigo, mensaje) => { if (mensaje) console.error(mensaje); rl.close(); process.exit(codigo); };
const exigirRespuesta = (respuesta) => { if (respuesta === null) salir(1, "✖ La entrada terminó antes de responder todo. No se cambió nada."); return respuesta; };

(async () => {
  const principal = archivos[0];
  if (!fs.existsSync(principal.ruta)) salir(1, "✖ No existe el .env de la carpeta raíz. Créalo primero con:  node scripts/crear-env.cjs");

  const correo = exigirRespuesta(await preguntar("Correo de Gmail que enviará los avisos: ")).trim();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(correo)) salir(1, "✖ Eso no parece un correo. No se cambió nada.");

  const clave = exigirRespuesta(await preguntar("Contraseña de aplicación (16 letras; se escribe oculta): ", true)).replace(/\s+/g, "");
  if (!/^[A-Za-z0-9]{16}$/.test(clave)) {
    salir(1, "✖ Una contraseña de aplicación de Google tiene 16 letras (puede mostrarse con espacios). No es la clave de tu cuenta. No se cambió nada.");
  }

  const tambienDesarrollo = fs.existsSync(archivos[1].ruta)
    && !/^n/i.test((await preguntar(`¿Actualizar también ${archivos[1].nombre}? [S/n]: `) ?? "").trim());

  for (const archivo of archivos.filter((a, i) => i === 0 || tambienDesarrollo)) {
    let contenido = fs.readFileSync(archivo.ruta, "utf8");
    for (const [variable, valor] of [["EMAIL_USER", correo], ["EMAIL_PASS", clave]]) {
      const linea = new RegExp(`^${variable}=.*$`, "m");
      contenido = linea.test(contenido) ? contenido.replace(linea, () => `${variable}=${valor}`) : `${contenido.trimEnd()}\n${variable}=${valor}\n`;
    }
    fs.writeFileSync(archivo.ruta, contenido);
    console.log(`✔ Credenciales guardadas en ${archivo.nombre} (la contraseña no se muestra).`);
  }
  console.log("Siguiente paso:  cd backend  y luego  npm run probar:correo -- tucorreo@ejemplo.com");
  salir(0);
})();
