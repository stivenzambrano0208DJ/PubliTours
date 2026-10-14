// Filtros de "Mis reservas" y cómo se ve cada estado de una reserva.
export const FILTROS_RESERVA = [
  { value: "todas", label: "Todas" },
  { value: "confirmada", label: "Confirmadas" },
  { value: "completada", label: "Completadas" },
  { value: "pendiente", label: "Pendientes" },
  { value: "rechazada", label: "Rechazadas" },
  { value: "cancelada", label: "Canceladas" },
  { value: "no_asistio", label: "No asistidas" },
];

export const ESTADO_UI = {
  confirmada: { label: "CONFIRMADA", icon: "check_circle", chip: "bg-emerald-50 text-secondary", barra: "bg-secondary" },
  pendiente: { label: "PENDIENTE", icon: "hourglass_top", chip: "bg-amber-50 text-on-tertiary-container", barra: "bg-on-tertiary-container" },
  rechazada: { label: "RECHAZADA", icon: "cancel", chip: "bg-error-container text-error", barra: "bg-error" },
  completada: { label: "COMPLETADA", icon: "task_alt", chip: "bg-primary-fixed text-on-primary-fixed-variant", barra: "bg-primary" },
  cancelada: { label: "CANCELADA", icon: "event_busy", chip: "bg-surface-container-high text-on-surface-variant", barra: "bg-outline" },
  no_asistio: { label: "NO ASISTIÓ", icon: "person_off", chip: "bg-error-container text-error", barra: "bg-error" },
};
