import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { api, marcarSesion, haySesion, EVENTO_SESION_EXPIRADA } from "./client";

const respuesta = (estado, cuerpo = {}) => Promise.resolve({ ok: estado < 400, status: estado, json: () => Promise.resolve(cuerpo), blob: () => Promise.resolve(new Blob()) });

describe("cliente de la API: sesión por cookie", () => {
  let escuchador;
  beforeEach(() => {
    localStorage.clear();
    escuchador = vi.fn();
    window.addEventListener(EVENTO_SESION_EXPIRADA, escuchador);
  });
  afterEach(() => {
    window.removeEventListener(EVENTO_SESION_EXPIRADA, escuchador);
    vi.unstubAllGlobals();
  });

  it("recuerda y olvida que hay una sesión abierta, sin guardar ningún token", () => {
    expect(haySesion()).toBe(false);
    marcarSesion(true);
    expect(haySesion()).toBe(true);
    expect(Object.keys(localStorage)).toEqual(["publitours_sesion"]);
    expect(localStorage.getItem("publitours_sesion")).toBe("1");
    marcarSesion(false);
    expect(haySesion()).toBe(false);
  });

  it("envía la cookie y la cabecera de la aplicación, y nunca una cabecera Authorization", async () => {
    const fetch = vi.fn(() => respuesta(200, {}));
    vi.stubGlobal("fetch", fetch);
    marcarSesion(true);
    await api.misReservas();
    await api.buscarSitios({});
    for (const [, opciones] of fetch.mock.calls) {
      expect(opciones.credentials).toBe("include");
      expect(opciones.headers["X-Requested-With"]).toBe("PubliTours");
      expect(opciones.headers.Authorization).toBeUndefined();
    }
  });

  it("un 401 con una sesión abierta la cierra localmente y lo avisa", async () => {
    vi.stubGlobal("fetch", vi.fn(() => respuesta(401, { error: "Tu sesión ya no es válida." })));
    marcarSesion(true);
    await expect(api.misReservas()).rejects.toThrow("Tu sesión ya no es válida.");
    expect(haySesion()).toBe(false);
    expect(escuchador).toHaveBeenCalledTimes(1);
  });

  it("un 401 de un inicio de sesión fallido (sin sesión) no dispara nada", async () => {
    vi.stubGlobal("fetch", vi.fn(() => respuesta(401, { error: "Credenciales inválidas." })));
    await expect(api.login({ correo: "a@a.com", password: "x" })).rejects.toThrow("Credenciales inválidas.");
    expect(escuchador).not.toHaveBeenCalled();
  });

  it("un 403 (por ejemplo, cuenta suspendida) muestra el mensaje pero no cierra la sesión", async () => {
    vi.stubGlobal("fetch", vi.fn(() => respuesta(403, { error: "Tu cuenta está suspendida." })));
    marcarSesion(true);
    await expect(api.misReservas()).rejects.toThrow("Tu cuenta está suspendida.");
    expect(haySesion()).toBe(true);
    expect(escuchador).not.toHaveBeenCalled();
  });

  it("la descarga de un archivo también envía la cookie y reacciona a una sesión vencida", async () => {
    const fetch = vi.fn(() => respuesta(401, { error: "Token inválido o expirado." }));
    vi.stubGlobal("fetch", fetch);
    marcarSesion(true);
    await expect(api.csvEstadisticasPrestador({})).rejects.toThrow("Token inválido o expirado.");
    expect(fetch.mock.calls[0][1].credentials).toBe("include");
    expect(haySesion()).toBe(false);
    expect(escuchador).toHaveBeenCalledTimes(1);
  });

  it("cerrar sesión llama al servidor, que es quien borra la cookie HttpOnly", async () => {
    const fetch = vi.fn(() => respuesta(200, { mensaje: "Sesión cerrada." }));
    vi.stubGlobal("fetch", fetch);
    await api.logout();
    expect(fetch.mock.calls[0][0]).toMatch(/\/auth\/logout$/);
    expect(fetch.mock.calls[0][1].method).toBe("POST");
  });

  it("un error sin cuerpo JSON muestra un mensaje genérico", async () => {
    vi.stubGlobal("fetch", vi.fn(() => Promise.resolve({ ok: false, status: 502, json: () => Promise.reject(new Error("no json")) })));
    await expect(api.buscarSitios({})).rejects.toThrow("Ocurrió un error inesperado.");
  });

  it("si la señal se corta o tarda demasiado, falla con un mensaje claro en lugar de quedarse cargando para siempre", async () => {
    vi.useFakeTimers();
    try {
      vi.stubGlobal("fetch", vi.fn((_url, opciones) => new Promise((_, rechazar) => {
        opciones.signal.addEventListener("abort", () => rechazar(Object.assign(new Error("abortado"), { name: "AbortError" })));
      })));
      const espera = api.misReservas().catch((e) => e);
      await vi.advanceTimersByTimeAsync(31_000);
      expect((await espera).message).toBe("La conexión está tardando demasiado. Revisa tu señal e inténtalo de nuevo.");
    } finally {
      vi.useRealTimers();
    }
  });

  it("si no hay red, avisa que no hay conexión", async () => {
    vi.stubGlobal("fetch", vi.fn(() => Promise.reject(new TypeError("Failed to fetch"))));
    await expect(api.misReservas()).rejects.toThrow("No hay conexión con el servidor. Revisa tu señal e inténtalo de nuevo.");
  });
});
