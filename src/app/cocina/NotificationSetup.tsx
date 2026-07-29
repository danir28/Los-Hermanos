import { useEffect, useState } from "react";
import { Bell, BellOff, BellRing } from "lucide-react";
import { getExistingSubscription, isPushSupported, subscribeToKitchenPush, unsubscribeFromKitchenPush } from "../lib/push";

// Activa/desactiva el aviso push de "pedido nuevo" en este dispositivo — pensado para la tablet
// fija de cocina, que puede quedar con la pantalla apagada (ver server/src/push/ y
// src/app/lib/push.ts). Se muestra en el Panel de cocina, arriba de la lista de pedidos, para que
// activar la notificación sea de lo primero que se hace al abrir la app en un dispositivo nuevo.
// No se renderiza nada mientras se resuelve el estado inicial ni en un navegador sin soporte
// (Safari de escritorio, por ejemplo) — no tiene sentido mostrar un control que no va a funcionar.
export function NotificationSetup({ token }: { token: string }) {
  const [status, setStatus] = useState<"loading" | "subscribed" | "unsubscribed" | "unsupported">("loading");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isPushSupported()) {
      setStatus("unsupported");
      return;
    }
    getExistingSubscription()
      .then(sub => setStatus(sub ? "subscribed" : "unsubscribed"))
      .catch(() => setStatus("unsubscribed"));
  }, []);

  const activate = async () => {
    setBusy(true);
    setError(null);
    try {
      await subscribeToKitchenPush(token);
      setStatus("subscribed");
    } catch (e) {
      setError(e instanceof Error ? e.message : "No se pudo activar la notificación");
    } finally {
      setBusy(false);
    }
  };

  const deactivate = async () => {
    setBusy(true);
    setError(null);
    try {
      await unsubscribeFromKitchenPush(token);
      setStatus("unsubscribed");
    } catch (e) {
      setError(e instanceof Error ? e.message : "No se pudo desactivar la notificación");
    } finally {
      setBusy(false);
    }
  };

  if (status === "loading" || status === "unsupported") return null;

  return (
    <div className="flex items-center gap-3 flex-wrap mb-6 bg-secondary/50 border border-border rounded-2xl px-4 py-3">
      {status === "subscribed" ? (
        <>
          <BellRing size={16} className="text-primary shrink-0" />
          <span className="text-sm font-medium flex-1">Notificaciones de pedidos activadas en este dispositivo</span>
          <button
            onClick={deactivate}
            disabled={busy}
            className="text-xs font-semibold text-muted-foreground hover:text-red-600 border border-border hover:border-red-200 px-3 py-1.5 rounded-full transition-colors disabled:opacity-50"
          >
            Desactivar
          </button>
        </>
      ) : (
        <>
          <BellOff size={16} className="text-muted-foreground shrink-0" />
          <span className="text-sm font-medium flex-1">
            Activá las notificaciones para enterarte de pedidos nuevos aunque la pantalla esté apagada
          </span>
          <button
            onClick={activate}
            disabled={busy}
            className="text-xs bg-primary text-primary-foreground px-4 py-2 rounded-xl hover:bg-primary/90 transition-colors font-semibold shadow-sm disabled:opacity-50 flex items-center gap-1.5"
          >
            <Bell size={13} /> {busy ? "Activando…" : "Activar notificaciones"}
          </button>
        </>
      )}
      {error && <span className="text-xs text-red-600 basis-full">{error}</span>}
    </div>
  );
}
