// Gráfica de barras en SVG (sin librerías). `datos` = [{ etiqueta, valor }]; `formato` convierte el valor a texto.
// Es accesible: describe todos los valores en el aria-label y cada barra lleva su <title>.
export default function GraficaBarras({ titulo, datos, formato = String }) {
  const ancho = 100; // unidades por barra
  const alto = 160;
  const margenSup = 22;
  const maximo = Math.max(...datos.map((d) => d.valor), 0);
  const descripcion = `${titulo}: ${datos.map((d) => `${d.etiqueta} ${formato(d.valor)}`).join(", ")}`;

  return (
    <figure className="flex flex-col gap-2 m-0">
      <figcaption className="font-title-sm text-title-sm text-on-surface font-semibold">{titulo}</figcaption>
      {datos.length === 0 || maximo === 0 ? (
        <p className="font-body-sm text-body-sm text-on-surface-variant py-6">Sin datos en este periodo.</p>
      ) : (
        <svg role="img" aria-label={descripcion} viewBox={`0 0 ${datos.length * ancho} ${alto + margenSup + 22}`} className="w-full h-auto max-h-64 text-on-surface">
          {datos.map((d, i) => {
            const altura = Math.max(2, (d.valor / maximo) * alto);
            const x = i * ancho + 18;
            return (
              <g key={d.etiqueta}>
                <title>{`${d.etiqueta}: ${formato(d.valor)}`}</title>
                <rect x={x} y={margenSup + alto - altura} width={ancho - 36} height={altura} rx="6" fill="currentColor" className="text-primary-container" />
                <text x={x + (ancho - 36) / 2} y={margenSup + alto - altura - 6} textAnchor="middle" fontSize="13" fontWeight="700" fill="currentColor">{formato(d.valor)}</text>
                <text x={x + (ancho - 36) / 2} y={margenSup + alto + 16} textAnchor="middle" fontSize="12" fill="currentColor" opacity="0.7">{d.etiqueta}</text>
              </g>
            );
          })}
        </svg>
      )}
    </figure>
  );
}
