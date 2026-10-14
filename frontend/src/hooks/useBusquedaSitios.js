import { useEffect, useMemo, useState } from "react";
import { api } from "../api/client";

const FILTROS_INICIALES = {
  texto: "", municipio: "", categoria: "", presupuesto_max: "", calificacion_min: "", fecha: "", tipo_viaje: "",
  orden: "relevancia", lat: "", lng: "", page: 1, limit: 6,
};

// Búsqueda del catálogo: filtros, resultados paginados, vista de mapa y lo que se deriva del catálogo real
// (categorías con su cantidad y municipios), sin inventar cifras.
export function useBusquedaSitios(textoInicial = "") {
  const [filtros, setFiltros] = useState({ ...FILTROS_INICIALES, texto: textoInicial });
  const [resultado, setResultado] = useState({ resultados: [], total: 0, total_paginas: 1, page: 1 });
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState("");

  // Cargado una sola vez para derivar categorías y municipios reales del catálogo.
  const [catalogoCompleto, setCatalogoCompleto] = useState([]);

  const [vista, setVista] = useState("lista");
  const [sitiosMapa, setSitiosMapa] = useState([]);
  const [cargandoMapa, setCargandoMapa] = useState(false);

  const buscar = async (params) => {
    setCargando(true);
    setError("");
    try {
      setResultado(await api.buscarSitios(params));
    } catch (err) {
      setError(err.message);
    } finally {
      setCargando(false);
    }
  };

  useEffect(() => {
    buscar(filtros);
    api.buscarSitios({ limit: 100 }).then((data) => setCatalogoCompleto(data.resultados)).catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // En la vista de mapa se cargan todos los resultados del filtro actual (sin paginar).
  useEffect(() => {
    if (vista !== "mapa") return;
    setCargandoMapa(true);
    api.buscarSitios({ ...filtros, orden: filtros.orden === "cercania" ? "cercania" : "relevancia", page: 1, limit: 100 })
      .then((d) => setSitiosMapa(d.resultados))
      .catch(() => setSitiosMapa([]))
      .finally(() => setCargandoMapa(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [vista, resultado]);

  const categorias = useMemo(() => {
    const conteo = {};
    catalogoCompleto.forEach((s) => { conteo[s.categoria] = (conteo[s.categoria] || 0) + 1; });
    return Object.entries(conteo).sort((a, b) => b[1] - a[1]);
  }, [catalogoCompleto]);

  const municipios = useMemo(() => [...new Set(catalogoCompleto.map((s) => s.municipio))].sort(), [catalogoCompleto]);

  // Cambia filtros sin buscar todavía (lo que se escribe en los campos de texto y número).
  const editar = (cambios) => setFiltros({ ...filtros, ...cambios });

  // Cambia filtros y busca desde la primera página.
  const aplicar = (cambios) => {
    const nuevos = { ...filtros, ...cambios, page: 1 };
    setFiltros(nuevos);
    buscar(nuevos);
  };

  const irPagina = (pagina) => {
    const nuevos = { ...filtros, page: pagina };
    setFiltros(nuevos);
    buscar(nuevos);
  };

  // "Más cercanos a mí" necesita la ubicación del turista: se pide una vez y se conserva para ordenar y para el mapa.
  const cambiarOrden = (valor) => {
    if (valor !== "cercania" || (filtros.lat && filtros.lng)) { aplicar({ orden: valor }); return; }
    if (!navigator.geolocation) { alert("Tu navegador no soporta geolocalización."); return; }
    navigator.geolocation.getCurrentPosition(
      (pos) => aplicar({ orden: "cercania", lat: pos.coords.latitude, lng: pos.coords.longitude }),
      () => alert("No pudimos obtener tu ubicación. Activa el permiso de ubicación del navegador para ordenar por cercanía.")
    );
  };

  return {
    filtros, editar, aplicar, irPagina, cambiarOrden,
    resultado, cargando, error,
    catalogoCompleto, categorias, municipios,
    vista, setVista, sitiosMapa, cargandoMapa,
  };
}
