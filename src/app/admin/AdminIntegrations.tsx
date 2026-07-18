import { useEffect, useState } from "react";
import { RefreshCw } from "lucide-react";
import { api } from "../lib/api";
import { useAuth } from "../auth";
import { IntegrationBadge, type IntegrationCardStatus } from "./IntegrationBadge";

// Pantalla de Integraciones: estado de FUDO y WhatsApp, y disparo manual de sincronización con FUDO.
// Solo-admin del lado del backend (requireRole("admin")): el token sale de la sesión de staff.
export function AdminIntegrations() {
  const { token } = useAuth();
  const [fudo, setFudo] = useState<{ status: IntegrationCardStatus; error: string | null; lastSync: string | null }>(
    { status: "loading", error: null, lastSync: null }
  );
  const [whatsapp, setWhatsapp] = useState<{ status: IntegrationCardStatus; error: string | null }>(
    { status: "loading", error: null }
  );
  const [syncing, setSyncing] = useState(false);
  const [syncMsg, setSyncMsg] = useState<string | null>(null);

  // Vuelve a consultar el estado de ambas integraciones contra el backend; cada una entra en
  // "loading" y se resuelve por separado, así una falla (ej. FUDO caído) no bloquea el estado de la otra.
  const refresh = () => {
    if (!token) return;
    setFudo(s => ({ ...s, status: "loading" }));
    setWhatsapp(s => ({ ...s, status: "loading" }));
    api.fudoStatus(token)
      .then(r => setFudo({ status: r.configured ? "ok" : "off", error: null, lastSync: r.lastSync ?? null }))
      .catch(e => setFudo({ status: "error", error: e instanceof Error ? e.message : "Error desconocido", lastSync: null }));
    api.whatsappStatus(token)
      .then(r => setWhatsapp({ status: r.configured ? "ok" : "off", error: null }))
      .catch(e => setWhatsapp({ status: "error", error: e instanceof Error ? e.message : "Error desconocido" }));
  };

  useEffect(refresh, [token]);

  // Dispara la sincronización manual del catálogo de FUDO y, si sale bien, refresca el estado
  // de ambas integraciones para que "Última sincronización" quede actualizada de inmediato.
  const handleSync = async () => {
    if (!token) return;
    setSyncing(true);
    setSyncMsg(null);
    try {
      const r = await api.fudoSync(token);
      setSyncMsg(`Se sincronizaron ${r.synced} productos.`);
      refresh();
    } catch (e) {
      setSyncMsg(e instanceof Error ? e.message : "Error al sincronizar");
    } finally {
      setSyncing(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto px-6 py-8">
      <div className="mb-8">
        <p className="font-mono text-xs text-muted-foreground uppercase tracking-widest mb-1">Configuración</p>
        <h1 className="font-display text-4xl font-bold">Integraciones</h1>
        <p className="text-muted-foreground mt-1 text-sm max-w-2xl">
          Conectá este sistema con FUDO y con el agente de WhatsApp. Las credenciales se cargan del lado del
          servidor (archivo <code className="font-mono text-xs bg-muted px-1 py-0.5 rounded">server/.env</code>),
          nunca acá.
        </p>
      </div>

      <div className="space-y-5">
        {/* FUDO */}
        <div className="bg-card border border-border rounded-2xl p-5">
          <div className="flex items-start justify-between gap-3 mb-2">
            <h3 className="font-semibold text-lg">FUDO</h3>
            <IntegrationBadge status={fudo.status} />
          </div>
          <p className="text-sm text-muted-foreground mb-4">
            Trae el catálogo de productos y precios desde FUDO hacia este sistema.
          </p>
          <div className="text-xs text-muted-foreground mb-4 space-y-1">
            {fudo.lastSync && <p>Última sincronización: {new Date(fudo.lastSync).toLocaleString("es-AR")}</p>}
            {fudo.error && <p className="text-red-600">{fudo.error}</p>}
            {syncMsg && <p className="text-foreground">{syncMsg}</p>}
            {fudo.status === "off" && (
              <p>
                Completá <code className="font-mono bg-muted px-1 py-0.5 rounded">FUDO_API_URL</code> y{" "}
                <code className="font-mono bg-muted px-1 py-0.5 rounded">FUDO_API_KEY</code> en{" "}
                <code className="font-mono bg-muted px-1 py-0.5 rounded">server/.env</code> para activar esta integración.
              </p>
            )}
          </div>
          <button onClick={handleSync} disabled={fudo.status !== "ok" || syncing}
            className="text-sm bg-primary/10 text-primary px-4 py-2 rounded-lg hover:bg-primary hover:text-primary-foreground transition-colors font-semibold disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-2">
            <RefreshCw size={14} className={syncing ? "animate-spin" : ""} />
            {syncing ? "Sincronizando…" : "Sincronizar productos ahora"}
          </button>
        </div>

        {/* WhatsApp */}
        <div className="bg-card border border-border rounded-2xl p-5">
          <div className="flex items-start justify-between gap-3 mb-2">
            <h3 className="font-semibold text-lg">Agente de WhatsApp</h3>
            <IntegrationBadge status={whatsapp.status} />
          </div>
          <p className="text-sm text-muted-foreground mb-4">
            Conecta este sistema con el agente de WhatsApp (Twilio) para recibir pedidos y enviar avisos de estado.
          </p>
          <div className="text-xs text-muted-foreground mb-4 space-y-1">
            {whatsapp.error && <p className="text-red-600">{whatsapp.error}</p>}
            <p>
              El agente debe enviar los eventos entrantes a{" "}
              <code className="font-mono bg-muted px-1 py-0.5 rounded">POST /api/whatsapp/webhook</code> de este servidor.
            </p>
            {whatsapp.status === "off" && (
              <p>
                Completá <code className="font-mono bg-muted px-1 py-0.5 rounded">WHATSAPP_AGENT_URL</code> en{" "}
                <code className="font-mono bg-muted px-1 py-0.5 rounded">server/.env</code> para activar esta integración.
              </p>
            )}
          </div>
          <button onClick={refresh}
            className="text-sm bg-primary/10 text-primary px-4 py-2 rounded-lg hover:bg-primary hover:text-primary-foreground transition-colors font-semibold flex items-center gap-2">
            <RefreshCw size={14} /> Actualizar estado
          </button>
        </div>
      </div>
    </div>
  );
}
