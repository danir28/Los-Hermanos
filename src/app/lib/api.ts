import type { Order, OrderStatus, OrderType, Product } from "../types";

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
  estimatedTime?: string;
};
export type UpdateOrderInput = { status?: OrderStatus; estimatedTime?: string };

// Disponibilidad de un turno de retiro (ver SLOT_* en server/src/orders/slots.ts): cuántos
// pedidos ya lo ocuparon sobre el cupo máximo, si ya pasó, y si todavía se puede elegir.
export type SlotAvailability = { time: string; taken: number; capacity: number; isPast: boolean; available: boolean };
export type TopProduct = { name: string; qty: number; revenue: number };
// Ventas entregadas de un día puntual del mes (day: 1-31) — usada para el gráfico de línea.
export type DailySales = { day: number; total: number };
// Un pedido entregado del mes, para la tabla de detalle.
export type OrderSummary = { id: string; orderNumber: string; customer: string; createdAt: string; itemCount: number; total: number };
export type MonthlyReport = {
  month: string;
  totalSales: number;
  orderCount: number;
  topProducts: TopProduct[];
  dailySales: DailySales[];
  orders: OrderSummary[];
};
export type LookupOrderInput = { orderNumber: string } | { phone: string };

export type UserRole = "recepcionista" | "cocina" | "admin";
export type UserProfile = { id: string; usuario: string; rol: UserRole; nombre: string; email: string; activo: boolean };
export type LoginResult = { token: string; user: UserProfile };

// Horario de un día de la semana (0=domingo..6=sábado, igual a Date#getDay()). openTime/closeTime
// en formato "HH:mm"; si closeTime <= openTime el cierre cruza la medianoche (ver isOpenAt del backend).
export type DaySchedule = { dayOfWeek: number; isOpen: boolean; openTime: string; closeTime: string };
export type BusinessHours = { days: DaySchedule[]; isOpenNow: boolean };

// Datos para crear/editar un producto del catálogo (ver server/src/products/types.ts).
export type CreateProductInput = {
  name: string;
  category: string;
  price: number;
  description: string;
  image: string;
  featured: boolean;
  active: boolean;
  outOfStock: boolean;
};
export type UpdateProductInput = Partial<CreateProductInput>;

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
  // Pública: disponibilidad de los turnos de retiro de la jornada comercial en curso, la
  // consume el SlotPicker tanto en el checkout del cliente como en la carga manual de staff.
  ordersSlots: () => request<SlotAvailability[]>("/api/orders/slots"),
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

  // ── Catálogo de productos ────────────────────────────────────────────────
  // Pública: la usa la app de cliente (menú, carta QR de mostrador) y la carga manual de
  // recepción/cocina — reemplaza el array PRODUCTS que antes vivía hardcodeado en el frontend.
  productsList: () => request<Product[]>("/api/products"),
  // Solo-admin: alta/edición/baja de productos — ver memoria de proyecto sobre por qué el
  // catálogo lo carga el admin a mano en vez de sincronizarse con FUDO.
  productsCreate: (token: string, input: CreateProductInput) =>
    request<Product>("/api/products", { method: "POST", token, body: JSON.stringify(input) }),
  productsUpdate: (token: string, id: number, patch: UpdateProductInput) =>
    request<Product>(`/api/products/${id}`, { method: "PATCH", token, body: JSON.stringify(patch) }),
  productsDelete: (token: string, id: number) =>
    request<{ ok: boolean }>(`/api/products/${id}`, { method: "DELETE", token }),
};
