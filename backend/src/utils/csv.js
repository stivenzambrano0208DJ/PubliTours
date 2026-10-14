// CSV con punto y coma (lo que abre bien Excel en español) y BOM UTF-8 para las tildes.
// Se neutralizan los textos que Excel interpretaría como fórmula (=, +, -, @).
const celda = (v) => {
  const texto = v === null || v === undefined ? "" : String(v);
  const seguro = /^[=+\-@\t\r]/.test(texto) ? `'${texto}` : texto;
  return /[;"\n\r]/.test(seguro) ? `"${seguro.replace(/"/g, '""')}"` : seguro;
};

const aCsv = (filas) => "\uFEFF" + filas.map((f) => f.map(celda).join(";")).join("\r\n") + "\r\n";

module.exports = { celda, aCsv };
