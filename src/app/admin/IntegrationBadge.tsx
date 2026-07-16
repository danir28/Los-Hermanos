// Estado de conexión de una integración externa (FUDO, WhatsApp).
export type IntegrationCardStatus = "loading" | "ok" | "off" | "error";

// Pastilla que muestra el estado de una integración externa en la pantalla de Integraciones.
export function IntegrationBadge({ status }: { status: IntegrationCardStatus }) {
  const cfg: Record<IntegrationCardStatus, { text: string; cls: string }> = {
    loading: { text: "Verificando…",   cls: "bg-gray-50 border-gray-200 text-gray-600" },
    ok:      { text: "Conectado",      cls: "bg-green-50 border-green-300 text-green-700" },
    off:     { text: "No configurado", cls: "bg-amber-50 border-amber-300 text-amber-700" },
    error:   { text: "Error",          cls: "bg-red-50 border-red-300 text-red-700" },
  };
  const { text, cls } = cfg[status];
  return <span className={`text-xs font-medium border px-2.5 py-1 rounded-full shrink-0 ${cls}`}>{text}</span>;
}
