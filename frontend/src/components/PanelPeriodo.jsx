import { useState } from "react";
import SelectorPeriodo from "./SelectorPeriodo";
import Boton from "./ui/Boton";
import Tarjeta from "./ui/Tarjeta";
import Aviso from "./ui/Aviso";
import { useConsulta } from "../hooks/useConsulta";
import { descargarArchivo } from "../utils/descarga";
import { periodoInicial } from "../utils/periodo";

// Cifra con su rótulo (y una nota opcional) para los resúmenes de los paneles de estadísticas.
export function Dato({ etiqueta, valor, nota }) {
  return (
    <div className="bg-surface-container-low rounded-xl p-4 flex flex-col gap-0.5">
      <span className="font-label-xs text-label-xs uppercase tracking-wider text-outline font-semibold">{etiqueta}</span>
      <span className="font-headline-md text-headline-md text-on-surface font-bold">{valor}</span>
      {nota && <span className="font-label-xs text-label-xs text-on-surface-variant">{nota}</span>}
    </div>
  );
}

// Panel de cifras por periodo, común a las tendencias de la plataforma (administración) y las estadísticas del negocio (prestador):
// título, selector de periodo, descarga en CSV, mensajes de error y de carga. Cada panel aporta qué consulta y cómo se muestran los datos.
//  - consultar(periodo) / descargar(periodo): llamadas al servidor (datos en JSON y archivo CSV); nombreCsv(periodo): nombre del archivo.
//  - children(datos): se llama cuando ya hay datos y devuelve lo que se muestra debajo.
//  - id y className: para anclar el panel y ajustar su ancho o su margen de desplazamiento.
export default function PanelPeriodo({ titulo, descripcion, consultar, descargar, nombreCsv, id, className = "", children }) {
  const [periodo, setPeriodo] = useState(periodoInicial);
  const [descargando, setDescargando] = useState(false);
  const [errorCsv, setErrorCsv] = useState("");

  const completo = Boolean(periodo.desde && periodo.hasta);
  const { datos, error, cargando } = useConsulta(`${periodo.desde}|${periodo.hasta}`, () => consultar(periodo), completo);

  const descargarCsv = async () => {
    setDescargando(true);
    setErrorCsv("");
    try {
      descargarArchivo(await descargar(periodo), nombreCsv(periodo));
    } catch (err) {
      setErrorCsv(err.message);
    } finally {
      setDescargando(false);
    }
  };

  return (
    <Tarjeta as="section" id={id} className={`${className} p-5 flex flex-col gap-5`.trim()}>
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-3">
        <div>
          <h2 className="font-title-lg text-title-lg text-on-surface font-semibold">{titulo}</h2>
          <p className="font-body-sm text-body-sm text-on-surface-variant">{descripcion}</p>
        </div>
        <div className="flex flex-wrap items-end gap-3">
          <SelectorPeriodo periodo={periodo} onCambio={setPeriodo} />
          <Boton type="button" onClick={descargarCsv} disabled={descargando || !completo || Boolean(error)} className="inline-flex items-center gap-2 px-4 py-2.5">
            <span className="material-symbols-outlined text-[18px]">download</span>
            {descargando ? "Preparando..." : "Descargar CSV"}
          </Boton>
        </div>
      </div>
      {errorCsv && <Aviso>{errorCsv}</Aviso>}
      {error && <Aviso>{error}</Aviso>}
      {cargando && <p className="font-body-sm text-body-sm text-on-surface-variant">Calculando...</p>}
      {datos && children(datos)}
    </Tarjeta>
  );
}
