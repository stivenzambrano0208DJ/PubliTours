import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { api } from "../api/client";
import { useConsulta } from "./useConsulta";
import { usePolling } from "./usePolling";
import { avisarCambioMensajes } from "./useMensajesSinLeer";

const CADA_MS = 5000;

// Une listas de mensajes sin repetir ninguno y en orden.
const unir = (...listas) => {
  const porId = new Map();
  for (const m of listas.flat()) porId.set(m.id, m);
  return [...porId.values()].sort((a, b) => a.id - b.id);
};

// El hilo de una conversación: los mensajes más recientes, los nuevos que llegan solos (cada 5 s con la pestaña a la vista), las páginas
// anteriores bajo demanda y el envío. Al leer, avisa al servidor y al contador del encabezado. Se monta con key = id de la conversación.
export function useHilo(id) {
  const { datos, error, cargando } = useConsulta(id, () => api.conversacion(id));
  const [anteriores, setAnteriores] = useState([]);
  const [nuevos, setNuevos] = useState([]);
  const [hayMasAnterior, setHayMasAnterior] = useState(null); // null = lo que dijo la primera carga

  const mensajes = useMemo(() => unir(anteriores, datos?.mensajes || [], nuevos), [anteriores, datos, nuevos]);
  const mensajesRef = useRef(mensajes);
  useEffect(() => { mensajesRef.current = mensajes; });

  const marcarLeida = useCallback(() => {
    api.marcarConversacionLeida(id).then(avisarCambioMensajes).catch(() => {});
  }, [id]);

  // Al abrir la conversación ya se leyó todo lo que tenía.
  useEffect(() => { if (datos) marcarLeida(); }, [datos, marcarLeida]);

  const traerNuevos = useCallback(async () => {
    const ultimo = mensajesRef.current.at(-1)?.id;
    if (!ultimo) return;
    try {
      const { mensajes: recibidos } = await api.conversacion(id, { despues: ultimo });
      if (recibidos.length === 0) return;
      setNuevos((previos) => unir(previos, recibidos));
      if (recibidos.some((m) => !m.mio)) marcarLeida(); // la conversación está abierta: lo que llega se lee
    } catch { /* sin conexión: se vuelve a intentar en el siguiente ciclo */ }
  }, [id, marcarLeida]);
  usePolling(traerNuevos, CADA_MS, Boolean(datos));

  const cargarAnteriores = useCallback(async () => {
    const primero = mensajesRef.current[0]?.id;
    const pagina = await api.conversacion(id, { antes: primero });
    setAnteriores((previos) => unir(pagina.mensajes, previos));
    setHayMasAnterior(pagina.hay_mas);
  }, [id]);

  const enviar = useCallback(async (texto, fotos) => {
    const enviado = await api.enviarMensaje(id, texto, fotos);
    setNuevos((previos) => unir(previos, [enviado]));
  }, [id]);

  return {
    cargando, error, mensajes, enviar, cargarAnteriores,
    lado: datos?.lado, contraparte: datos?.contraparte, puedeEscribir: datos?.puede_escribir ?? true,
    hayMas: hayMasAnterior ?? Boolean(datos?.hay_mas),
  };
}
