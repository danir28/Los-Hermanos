import type { Order, OrderStatus, OrderType, Product, SelectionType } from "../types";

const API_URL = import.meta.env.VITE_API_URL ?? "http://localhost:4000";

// Las fotos de un producto pueden venir de dos orígenes: absolutas (las de stock de Unsplash con
// las que se cargó el catálogo original) o relativas ("/uploads/products/xxx.jpg", lo que
// devuelve el backend al subir una foto nueva desde el admin — ver server/src/products/uploads.ts),
// servidas por ese mismo backend. El navegador resuelve una URL relativa contra el origen de la
// PÁGINA (el frontend, en Netlify), no contra el backend (el droplet) — sin este paso, una foto
// recién subida se pediría al dominio equivocado y quedaría rota (ícono de imagen rota). Se
// normaliza acá, en el único punto de entrada de los datos de producto, para que el resto de la
// app (CustomerMenu, AdminProducts, CartItem.image, OrderTicket, etc.) nunca tenga que pensar en
// esto — ver los métodos productsList/productsCreate/... más abajo, todos pasan por acá.
function resolveProductImageUrls(product: Product): Product {
  return {
    ...product,
    images: product.images.map(img => ({
      ...img,
      url: /^https?:\/\//.test(img.url) ? img.url : `${API_URL}${img.url}`,
    })),
  };
}

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
  items: { name: string; qty: number; price: number; notes?: string }[];
  type: OrderType;
  estimatedTime: string;
};
export type UpdateOrderInput = { status?: OrderStatus; estimatedTime?: string };

// Disponibilidad de un turno de retiro (ver SLOT_*/MIN_LEAD_MINUTES en server/src/orders/slots.ts):
// cuántos pedidos ya lo ocuparon sobre el cupo máximo, si ya está demasiado cerca para darle
// tiempo a cocina (o directamente pasado), y si todavía se puede elegir.
export type SlotAvailability = { time: string; taken: number; capacity: number; tooSoon: boolean; available: boolean };
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

// Suscripción Web Push tal como la devuelve PushSubscription#toJSON() en el navegador (ver
// src/app/lib/push.ts) — mismo shape que espera server/src/push/types.ts#PushSubscriptionPayload.
export type PushSubscriptionInput = { endpoint: string; keys: { p256dh: string; auth: string } };

export type UserRole = "recepcionista" | "cocina" | "admin";
export type UserProfile = { id: string; usuario: string; rol: UserRole; nombre: string; email: string; activo: boolean };
export type LoginResult = { token: string; user: UserProfile };

// Una franja horaria en formato "HH:mm"; si closeTime <= openTime la franja cruza la
// medianoche (ver isOpenAt del backend).
export type TimeRange = { openTime: string; closeTime: string };
// Horario de un día de la semana (0=domingo..6=sábado, igual a Date#getDay()). `ranges` soporta
// horario partido (ej. abre 11-15 y vuelve a abrir 19-23 el mismo día); un día cerrado tiene
// `ranges: []`.
export type DaySchedule = { dayOfWeek: number; isOpen: boolean; ranges: TimeRange[] };
export type BusinessHours = { days: DaySchedule[]; isOpenNow: boolean };

// Una franja de retiro en formato "HH:mm". A diferencia de TimeRange (BusinessHours), nunca
// cruza la medianoche: startTime siempre es anterior a endTime.
export type SlotTimeRange = { startTime: string; endTime: string };
// Ventana de retiro PROGRAMABLE de un día de la semana — no confundir con DaySchedule/BusinessHours
// (horario de ATENCIÓN del local). `ranges` define entre qué horas la grilla de turnos
// (SlotPicker) ofrece horarios de retiro ese día; soporta franjas múltiples calcadas de un
// horario partido del local (cada una tiene que caer dentro de alguna franja de BusinessHours
// de ese mismo día, validado en el backend).
export type SlotWindowDay = { dayOfWeek: number; ranges: SlotTimeRange[] };
export type SlotWindows = { days: SlotWindowDay[] };

// Datos para crear/editar un producto del catálogo (ver server/src/products/types.ts). Ya no
// incluye `image`: las fotos se administran por endpoints propios (productsUploadImage y cía.),
// no por este payload — un producto nace sin fotos y se le suben después de creado.
export type CreateProductInput = {
  name: string;
  category: string;
  price: number;
  description: string;
  featured: boolean;
  active: boolean;
  outOfStock: boolean;
  offerAsOption: boolean;
};
export type UpdateProductInput = Partial<CreateProductInput>;

// Payload para reemplazar el set completo de grupos de opciones de un producto (ver
// server/src/products/types.ts#CreateOptionGroupInput) — mismo shape sin id (se generan en el
// backend al crearlos). sourceCategory: null para un grupo manual (options son las opciones
// tipeadas a mano, sourceProductId siempre null); un string no vacío para un grupo dinámico (ahí
// options son overrides puntuales de precio — cada uno con sourceProductId obligatorio,
// apuntando al producto que se está excepcionando — y defaultPriceDelta es el precio de
// cualquier opción SIN override).
export type UpsertOptionInput = { name: string; priceDelta: number; sortOrder: number; sourceProductId: number | null };
export type UpsertOptionGroupInput = {
  name: string;
  selectionType: SelectionType;
  required: boolean;
  quantityTarget: number | null;
  sourceCategory: string | null;
  defaultPriceDelta: number;
  sortOrder: number;
  options: UpsertOptionInput[];
};

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
  // Borra un pedido de forma permanente (solo-admin) — pensado para limpiar pedidos de prueba
  // desde Reportes, ver AdminReports.tsx. Irreversible: el llamador tiene que confirmar antes.
  ordersDelete: (token: string, id: string) =>
    request<{ ok: boolean }>(`/api/orders/${id}`, { method: "DELETE", token }),

  // ── Notificaciones push (solo-cocina) ───────────────────────────────────
  // Guarda la suscripción push del dispositivo (ver src/app/lib/push.ts#subscribeToKitchenPush).
  pushSubscribe: (token: string, subscription: PushSubscriptionInput) =>
    request<{ ok: boolean }>("/api/push/subscribe", { method: "POST", token, body: JSON.stringify(subscription) }),
  // Da de baja una suscripción puntual, identificada por su endpoint.
  pushUnsubscribe: (token: string, endpoint: string) =>
    request<{ ok: boolean }>("/api/push/unsubscribe", { method: "POST", token, body: JSON.stringify({ endpoint }) }),

  // ── Reportes (solo-admin) ────────────────────────────────────────────────
  // Trae el reporte mensual: total facturado, cantidad de pedidos y productos más vendidos.
  reportsMonthly: (token: string, month: string) => request<MonthlyReport>(`/api/reports/monthly?month=${month}`, { token }),

  // ── Horario de atención ─────────────────────────────────────────────────
  // Pública: la usa la Home del cliente para mostrar el horario y decidir si bloquea el checkout.
  businessHoursGet: () => request<BusinessHours>("/api/business-hours"),
  // Solo-admin: reemplaza el horario de la semana completa.
  businessHoursUpdate: (token: string, days: DaySchedule[]) =>
    request<BusinessHours>("/api/business-hours", { method: "PUT", token, body: JSON.stringify({ days }) }),

  // ── Grilla de turnos de retiro (solo-cocina) ────────────────────────────
  // A diferencia de businessHours, ni el GET es público: el cliente solo ve el resultado ya
  // aplicado a través de ordersSlots, no la configuración cruda.
  slotWindowsGet: (token: string) => request<SlotWindows>("/api/slot-windows", { token }),
  slotWindowsUpdate: (token: string, days: SlotWindowDay[]) =>
    request<SlotWindows>("/api/slot-windows", { method: "PUT", token, body: JSON.stringify({ days }) }),

  // ── Catálogo de productos ────────────────────────────────────────────────
  // Pública: la usa la app de cliente (menú, carta QR de mostrador) y la carga manual de
  // recepción/cocina — reemplaza el array PRODUCTS que antes vivía hardcodeado en el frontend.
  productsList: () => request<Product[]>("/api/products").then(products => products.map(resolveProductImageUrls)),
  // Solo-admin: alta/edición/baja de productos — ver memoria de proyecto sobre por qué el
  // catálogo lo carga el admin a mano en vez de sincronizarse con FUDO.
  productsCreate: (token: string, input: CreateProductInput) =>
    request<Product>("/api/products", { method: "POST", token, body: JSON.stringify(input) }).then(resolveProductImageUrls),
  productsUpdate: (token: string, id: number, patch: UpdateProductInput) =>
    request<Product>(`/api/products/${id}`, { method: "PATCH", token, body: JSON.stringify(patch) }).then(resolveProductImageUrls),
  productsDelete: (token: string, id: number) =>
    request<{ ok: boolean }>(`/api/products/${id}`, { method: "DELETE", token }),
  // Sube una foto nueva al carrusel del producto. No pasa por request(): esa función fuerza
  // "Content-Type: application/json" en todos los pedidos, y un multipart necesita que el
  // browser arme el header con el boundary correcto — por eso el fetch se arma acá directo.
  productsUploadImage: async (token: string, productId: number, file: File): Promise<Product> => {
    const form = new FormData();
    form.append("image", file);
    const res = await fetch(`${API_URL}/api/products/${productId}/images`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
      body: form,
    });
    const body = await res.json().catch(() => null);
    if (!res.ok) throw new ApiError(res.status, body?.error ?? `Error ${res.status} al subir la imagen`);
    return resolveProductImageUrls(body as Product);
  },
  productsDeleteImage: (token: string, productId: number, imageId: number) =>
    request<Product>(`/api/products/${productId}/images/${imageId}`, { method: "DELETE", token }).then(resolveProductImageUrls),
  productsReorderImages: (token: string, productId: number, orderedIds: number[]) =>
    request<Product>(`/api/products/${productId}/images/reorder`, { method: "PATCH", token, body: JSON.stringify({ orderedIds }) }).then(resolveProductImageUrls),
  // Reemplaza el set completo de grupos de opciones de un producto (ver
  // server/src/products/service.ts#replaceOptionGroups).
  productsSaveOptionGroups: (token: string, productId: number, groups: UpsertOptionGroupInput[]) =>
    request<Product>(`/api/products/${productId}/option-groups`, { method: "PUT", token, body: JSON.stringify(groups) }).then(resolveProductImageUrls),
};
