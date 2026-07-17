import type { Order, OrderStatus, OrderType } from "../types";

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

export type CreateOrderInput = {
  customer: string;
  phone: string;
  items: { name: string; qty: number; price: number }[];
  type: OrderType;
};
export type UpdateOrderInput = { status?: OrderStatus; estimatedTime?: string };
export type TopProduct = { name: string; qty: number; revenue: number };
export type MonthlyReport = { month: string; totalSales: number; orderCount: number; topProducts: TopProduct[] };

export const api = {
  fudoStatus: () => request<IntegrationStatus>("/api/fudo/status"),
  fudoSync: () => request<FudoSyncResult>("/api/fudo/sync", { method: "POST" }),
  whatsappStatus: () => request<IntegrationStatus>("/api/whatsapp/status"),
  whatsappNotify: (to: string, message: string) =>
    request<{ sent: boolean }>("/api/whatsapp/notify", {
      method: "POST",
      body: JSON.stringify({ to, message }),
    }),
  ordersList: () => request<Order[]>("/api/orders"),
  ordersCreate: (input: CreateOrderInput) =>
    request<Order>("/api/orders", { method: "POST", body: JSON.stringify(input) }),
  ordersUpdate: (id: string, patch: UpdateOrderInput) =>
    request<Order>(`/api/orders/${id}`, { method: "PATCH", body: JSON.stringify(patch) }),
  reportsMonthly: (month: string) => request<MonthlyReport>(`/api/reports/monthly?month=${month}`),
};
