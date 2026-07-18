import type { Order, OrderStatus, OrderType } from "../types";

const API_URL = import.meta.env.VITE_API_URL ?? "http://localhost:4000";

// Error tipado con el status HTTP, para que los llamadores puedan distinguir casos
// puntuales (ej. 404 en ordersLookup) de errores genéricos sin parsear el mensaje.
export class ApiError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.name = "ApiError";
    this.status = status;
  }
}

async function request<T>(path: string, options?: RequestInit & { token?: string }): Promise<T> {
  const { token, headers, ...rest } = options ?? {};
  let res: Response;
  try {
    res = await fetch(`${API_URL}${path}`, {
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...headers,
      },
      ...rest,
    });
  } catch {
    throw new Error(`No se pudo contactar al servidor en ${API_URL}. ¿Está corriendo? (npm run dev dentro de /server)`);
  }

  const body = await res.json().catch(() => null);
  if (!res.ok) {
    throw new ApiError(res.status, body?.error ?? `Error ${res.status} al contactar el servidor`);
  }
  return body as T;
}

export type IntegrationStatus = { configured: boolean; lastSync?: string | null };
export type FudoSyncResult = { synced: number; syncedAt: string };

export type CreateOrderInput = {
  customer: string;
  phone: string;
  items: { name: string; qty: number; price: number }[];
  type: OrderType;
};
export type UpdateOrderInput = { status?: OrderStatus; estimatedTime?: string };
export type TopProduct = { name: string; qty: number; revenue: number };
export type MonthlyReport = { month: string; totalSales: number; orderCount: number; topProducts: TopProduct[] };
export type LookupOrderInput = { orderNumber: string } | { phone: string };

export type UserRole = "recepcionista" | "cocina" | "admin";
export type UserProfile = { id: string; usuario: string; rol: UserRole; nombre: string; email: string; activo: boolean };
export type LoginResult = { token: string; user: UserProfile };

export const api = {
  // ── Auth (pública la de login; el resto exige un token ya emitido) ─────────
  authLogin: (usuario: string, password: string) =>
    request<LoginResult>("/api/auth/login", { method: "POST", body: JSON.stringify({ usuario, password }) }),
  authMe: (token: string) => request<UserProfile>("/api/auth/me", { token }),
  authLogout: (token: string) => request<{ ok: boolean }>("/api/auth/logout", { method: "POST", token }),

  // ── Integraciones (solo-admin) ──────────────────────────────────────────────
  fudoStatus: (token: string) => request<IntegrationStatus>("/api/fudo/status", { token }),
  fudoSync: (token: string) => request<FudoSyncResult>("/api/fudo/sync", { method: "POST", token }),
  whatsappStatus: (token: string) => request<IntegrationStatus>("/api/whatsapp/status", { token }),
  whatsappNotify: (token: string, to: string, message: string) =>
    request<{ sent: boolean }>("/api/whatsapp/notify", {
      method: "POST",
      token,
      body: JSON.stringify({ to, message }),
    }),

  // ── Pedidos ──────────────────────────────────────────────────────────────
  // Pública: la usan tanto el cliente (checkout) como recepción (alta manual).
  ordersCreate: (input: CreateOrderInput) =>
    request<Order>("/api/orders", { method: "POST", body: JSON.stringify(input) }),
  // Pública: la usa el cliente para seguimiento. Devuelve null en vez de tirar
  // cuando no hay match (404), para que el llamador no tenga que distinguir
  // "no encontrado" de un error real del servidor.
  ordersLookup: async (query: LookupOrderInput): Promise<Order | null> => {
    const params = "orderNumber" in query
      ? `orderNumber=${encodeURIComponent(query.orderNumber)}`
      : `phone=${encodeURIComponent(query.phone)}`;
    try {
      return await request<Order>(`/api/orders/lookup?${params}`);
    } catch (e) {
      if (e instanceof ApiError && e.status === 404) return null;
      throw e;
    }
  },
  // Solo staff: expone nombre/teléfono de todos los clientes.
  ordersList: (token: string) => request<Order[]>("/api/orders", { token }),
  ordersUpdate: (token: string, id: string, patch: UpdateOrderInput) =>
    request<Order>(`/api/orders/${id}`, { method: "PATCH", token, body: JSON.stringify(patch) }),

  // ── Reportes (solo-admin) ────────────────────────────────────────────────
  reportsMonthly: (token: string, month: string) => request<MonthlyReport>(`/api/reports/monthly?month=${month}`, { token }),
};
