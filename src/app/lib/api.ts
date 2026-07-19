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

// Wrapper genérico de fetch: arma la URL completa contra API_URL, agrega el header
// Authorization si se pasa un token, y parsea la respuesta como JSON, lanzando ApiError si el
// status no es 2xx — así cada método de `api` no repite este manejo de error a mano.
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

// Horario de un día de la semana (0=domingo..6=sábado, igual a Date#getDay()). openTime/closeTime
// en formato "HH:mm"; si closeTime <= openTime el cierre cruza la medianoche (ver isOpenAt del backend).
export type DaySchedule = { dayOfWeek: number; isOpen: boolean; openTime: string; closeTime: string };
export type BusinessHours = { days: DaySchedule[]; isOpenNow: boolean };

export const api = {
  // ── Auth (pública la de login; el resto exige un token ya emitido) ─────────
  // Login de staff: valida usuario/contraseña contra el backend y devuelve el token JWT + perfil.
  authLogin: (usuario: string, password: string) =>
    request<LoginResult>("/api/auth/login", { method: "POST", body: JSON.stringify({ usuario, password }) }),
  // Recupera el perfil del dueño del token — lo usa AuthProvider para validar la sesión al montar.
  authMe: (token: string) => request<UserProfile>("/api/auth/me", { token }),
  // Cierra la sesión del lado del cliente (no hay tabla de tokens revocados en el backend).
  authLogout: (token: string) => request<{ ok: boolean }>("/api/auth/logout", { method: "POST", token }),

  // ── Integraciones (solo-admin) ──────────────────────────────────────────────
  // Consulta si la integración con FUDO está configurada y la fecha del último sync.
  fudoStatus: (token: string) => request<IntegrationStatus>("/api/fudo/status", { token }),
  // Dispara una sincronización manual del catálogo de FUDO contra el backend.
  fudoSync: (token: string) => request<FudoSyncResult>("/api/fudo/sync", { method: "POST", token }),
  // Consulta si la integración con el agente de WhatsApp está configurada.
  whatsappStatus: (token: string) => request<IntegrationStatus>("/api/whatsapp/status", { token }),
  // Envía un mensaje de WhatsApp a un número puntual a través del agente.
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
  // Solo staff: expone nombre/teléfono de todos los clientes. El backend recorta el
  // resultado a la jornada comercial actual cuando el token es de un recepcionista
  // (cocina/admin siguen recibiendo el historial completo).
  ordersList: (token: string) => request<Order[]>("/api/orders", { token }),
  // Actualiza estado y/o horario estimado de un pedido puntual, identificado por su id (uuid) —
  // nunca por orderNumber, que puede repetirse entre jornadas comerciales distintas.
  ordersUpdate: (token: string, id: string, patch: UpdateOrderInput) =>
    request<Order>(`/api/orders/${id}`, { method: "PATCH", token, body: JSON.stringify(patch) }),

  // ── Reportes (solo-admin) ────────────────────────────────────────────────
  // Trae el reporte mensual: total facturado, cantidad de pedidos y productos más vendidos.
  reportsMonthly: (token: string, month: string) => request<MonthlyReport>(`/api/reports/monthly?month=${month}`, { token }),

  // ── Horario de atención ─────────────────────────────────────────────────
  // Pública: la usa la Home del cliente para mostrar el horario y decidir si bloquea el checkout.
  businessHoursGet: () => request<BusinessHours>("/api/business-hours"),
  // Solo-admin: reemplaza el horario de la semana completa.
  businessHoursUpdate: (token: string, days: DaySchedule[]) =>
    request<BusinessHours>("/api/business-hours", { method: "PUT", token, body: JSON.stringify({ days }) }),
};
