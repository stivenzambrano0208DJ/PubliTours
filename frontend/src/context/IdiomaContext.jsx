import { useCallback, useEffect, useMemo, useState } from "react";
import { IdiomaContext, IDIOMAS, LOCALES, traducir, traducirDato } from "./idioma";

const CLAVE = "publitours.idioma";

// El sitio abre en español; el inglés se activa con el botón del encabezado y la elección se recuerda en este navegador.
// (No se toma el idioma del navegador: muchos equipos en Colombia vienen en inglés y la mayoría del público habla español.)
function idiomaInicial() {
  try {
    const guardado = localStorage.getItem(CLAVE);
    if (IDIOMAS.includes(guardado)) return guardado;
  } catch { /* almacenamiento bloqueado: español */ }
  return "es";
}

export function IdiomaProvider({ children }) {
  const [idioma, setIdioma] = useState(idiomaInicial);

  useEffect(() => {
    document.documentElement.lang = idioma; // lectores de pantalla y traductores del navegador
  }, [idioma]);

  const cambiarIdioma = useCallback((nuevo) => {
    if (!IDIOMAS.includes(nuevo)) return;
    setIdioma(nuevo);
    try { localStorage.setItem(CLAVE, nuevo); } catch { /* sin almacenamiento: dura solo esta visita */ }
  }, []);

  const valor = useMemo(() => ({
    idioma,
    locale: LOCALES[idioma],
    cambiarIdioma,
    t: (texto, valores) => traducir(idioma, texto, valores),
    td: (valor) => traducirDato(idioma, valor),
  }), [idioma, cambiarIdioma]);

  return <IdiomaContext.Provider value={valor}>{children}</IdiomaContext.Provider>;
}
