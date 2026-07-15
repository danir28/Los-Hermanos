const API_URL = import.meta.env.VITE_API_URL ?? "http://localhost:4000";

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  let res: Response;
  try {
    res = await fetch(`${API_URL}${path}`, {
      headers: { "Content-Type": "application/json" },
      ...options,
    });
  } catch {
    throw new Error(`No se pudo contactar al servidor en ${API_URL}. ¿Está corriendo? (npm run dev dentro de /server)`);
  }

  const body = await res.json().catch(() => null);
  if (!res.ok) {
    throw new Error(body?.error ?? `Error ${res.status} al contactar el servidor`);
  }
  return body as T;
}

export type IntegrationStatus = { configured: boolean; lastSync?: string | null };
export type FudoSyncResult = { synced: number; syncedAt: string };

export const api = {
  fudoStatus: () => request<IntegrationStatus>("/api/fudo/status"),
  fudoSync: () => request<FudoSyncResult>("/api/fudo/sync", { method: "POST" }),
  whatsappStatus: () => request<IntegrationStatus>("/api/whatsapp/status"),
  whatsappNotify: (to: string, message: string) =>
    request<{ sent: boolean }>("/api/whatsapp/notify", {
      method: "POST",
      body: JSON.stringify({ to, message }),
    }),
};
