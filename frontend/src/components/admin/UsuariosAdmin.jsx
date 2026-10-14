import { useEffect, useState } from "react";
import { api } from "../../api/client";

const ROLES = [
  { value: "", label: "Todos" },
  { value: "turista", label: "Turistas" },
  { value: "prestador", label: "Prestadores" },
  { value: "administrador", label: "Administradores" },
];

export default function UsuariosAdmin({ usuarioActualId }) {
  const [usuarios, setUsuarios] = useState([]);
  const [texto, setTexto] = useState("");
  const [rol, setRol] = useState("");
  const [cargando, setCargando] = useState(true);
  const [accionando, setAccionando] = useState(null);

  useEffect(() => {
    const t = setTimeout(() => {
      api.usuariosAdmin({ texto, rol }).then(setUsuarios).catch(() => {}).finally(() => setCargando(false));
    }, 250);
    return () => clearTimeout(t);
  }, [texto, rol]);

  const cambiarEstado = async (u) => {
    const suspender = u.activo;
    if (suspender && !window.confirm(`¿Suspender la cuenta de ${u.nombre}? No podrá iniciar sesión ni usar la plataforma hasta que la reactives.`)) return;
    setAccionando(u.id);
    try {
      await api.estadoUsuario(u.id, !u.activo);
      setUsuarios((prev) => prev.map((x) => (x.id === u.id ? { ...x, activo: !u.activo } : x)));
    } catch (err) {
      alert(err.message);
    } finally {
      setAccionando(null);
    }
  };

  return (
    <section className="bg-surface-container-lowest rounded-2xl shadow-sm overflow-hidden">
      <div className="p-5 flex flex-col lg:flex-row lg:items-center justify-between gap-3">
        <div>
          <h2 className="font-title-lg text-title-lg text-on-surface font-semibold">Usuarios</h2>
          <p className="font-body-sm text-body-sm text-on-surface-variant">{usuarios.length} cuenta(s) encontrada(s)</p>
        </div>
        <div className="flex flex-col sm:flex-row gap-2">
          <div className="relative">
            <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-outline text-[18px]">search</span>
            <input
              className="w-full sm:w-64 pl-9 pr-3 py-2 bg-surface-container rounded-xl font-body-sm text-body-sm focus:outline-none focus:bg-surface-container-low"
              placeholder="Buscar por nombre o correo..."
              value={texto}
              onChange={(e) => setTexto(e.target.value)}
            />
          </div>
          <select className="px-3 py-2 bg-surface-container rounded-xl font-body-sm text-body-sm focus:outline-none" value={rol} onChange={(e) => setRol(e.target.value)}>
            {ROLES.map((r) => <option key={r.value} value={r.value}>{r.label}</option>)}
          </select>
        </div>
      </div>

      {cargando ? (
        <p className="px-5 pb-5 font-body-sm text-body-sm text-on-surface-variant">Cargando...</p>
      ) : usuarios.length === 0 ? (
        <p className="px-5 pb-5 font-body-sm text-body-sm text-on-surface-variant">
          {texto || rol ? "No hay cuentas que coincidan con la búsqueda." : "Aún no hay cuentas registradas."}
        </p>
      ) : (
        <div className="w-full overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-surface-container-low text-outline font-label-xs text-label-xs uppercase tracking-wider">
                <th className="py-3 px-5 font-semibold">Usuario</th>
                <th className="py-3 px-3 font-semibold">Rol</th>
                <th className="py-3 px-3 font-semibold">Registro</th>
                <th className="py-3 px-3 font-semibold">Estado</th>
                <th className="py-3 px-5 font-semibold text-right">Acción</th>
              </tr>
            </thead>
            <tbody className="font-body-sm text-body-sm">
              {usuarios.map((u) => (
                <tr key={u.id} className="border-t border-surface-container-low hover:bg-surface-container-low/60 transition-colors">
                  <td className="py-3 px-5">
                    <div className="flex flex-col">
                      <span className="font-title-sm text-title-sm text-on-surface font-semibold">{u.nombre}</span>
                      <span className="font-label-xs text-label-xs text-outline">{u.correo}</span>
                      {u.Prestador && <span className="font-label-xs text-label-xs text-secondary">{u.Prestador.nombre_negocio} · {u.Prestador.estado_verificacion}</span>}
                    </div>
                  </td>
                  <td className="py-3 px-3 capitalize">{u.rol}</td>
                  <td className="py-3 px-3 text-on-surface-variant">{new Date(u.fecha_registro).toLocaleDateString("es-CO")}</td>
                  <td className="py-3 px-3">
                    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full font-label-xs text-label-xs font-semibold ${u.activo ? "bg-secondary-container/50 text-on-secondary-container" : "bg-error-container text-error"}`}>
                      <span className={`w-2 h-2 rounded-full ${u.activo ? "bg-secondary" : "bg-error"}`} />
                      {u.activo ? "Activa" : "Suspendida"}
                    </span>
                  </td>
                  <td className="py-3 px-5 text-right">
                    {u.rol === "administrador" || u.id === usuarioActualId ? (
                      <span className="font-label-xs text-label-xs text-outline">—</span>
                    ) : (
                      <button
                        onClick={() => cambiarEstado(u)}
                        disabled={accionando === u.id}
                        className={`px-3 py-1.5 rounded-xl font-label-xs text-label-xs font-semibold transition-colors disabled:opacity-50 ${u.activo ? "bg-surface-container text-error hover:bg-error-container" : "bg-primary text-on-primary hover:bg-secondary"}`}
                      >
                        {u.activo ? "Suspender" : "Reactivar"}
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
