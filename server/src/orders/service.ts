import { db } from "../db.js";
import type { Order, OrderItem } from "../generated/prisma/client.js";
import { businessDayFor } from "./businessDay.js";
import type { CreateOrderInput, OrderDTO, UpdateOrderInput } from "./types.js";

export class OrderNotFoundError extends Error {
  constructor(id: string) {
    super(`No existe el pedido #${id}`);
    this.name = "OrderNotFoundError";
  }
}

type OrderWithItems = Order & { items: OrderItem[] };

// Formatea el correlativo de una jornada (orderNumber) al número con padding que usa la UI
// ("007"). Ya no es un identificador único global — se reinicia cada jornada comercial (ver
// businessDay.ts) — por eso nunca se usa solo para buscar/actualizar un pedido puntual.
function toDisplayNumber(orderNumber: number): string {
  return String(orderNumber).padStart(3, "0");
}

// Formatea una fecha completa a la hora "HH:MM" que espera el frontend (mismo formato que
// ya usa App.tsx con toLocaleTimeString, para no tener que tocar cocina/timeAgo.ts).
function formatCreatedAt(date: Date): string {
  // hour12: false es necesario acá: a diferencia del navegador, el ICU de Node
  // devuelve "10:04 p. m." en vez de "22:04" para el locale es-AR si no se fuerza.
  return date.toLocaleTimeString("es-AR", { hour: "2-digit", minute: "2-digit", hour12: false });
}

// Convierte un pedido de la base (con Decimal y orderNumber) a la forma que espera el frontend.
// id es el identificador real (uuid) — lo que hay que mandar para actualizar este pedido puntual.
// orderNumber es solo el número visible ("007"), que puede repetirse en otra jornada comercial.
function toDTO(order: OrderWithItems): OrderDTO {
  return {
    id: order.id,
    orderNumber: toDisplayNumber(order.orderNumber),
    customer: order.customer,
    phone: order.phone,
    items: order.items.map(i => ({ name: i.name, qty: i.qty, price: Number(i.price) })),
    status: order.status,
    createdAt: formatCreatedAt(order.createdAt),
    estimatedTime: order.estimatedTime,
    total: Number(order.total),
    type: order.type,
    deliveredAt: order.deliveredAt ? order.deliveredAt.toISOString() : null,
  };
}

// Crea un pedido nuevo (online, presencial, telefónico) con estado inicial "Pendiente" y sin
// horario asignado todavía; el total se calcula a partir de los ítems recibidos. El número
// visible se asigna con un upsert atómico sobre OrderCounter (increment), para que dos pedidos
// creados casi al mismo tiempo nunca se lleven el mismo número dentro de la misma jornada.
export async function createOrder(input: CreateOrderInput): Promise<OrderDTO> {
  const total = input.items.reduce((s, i) => s + i.price * i.qty, 0);
  const businessDate = businessDayFor(new Date());

  const counter = await db.orderCounter.upsert({
    where: { businessDate },
    create: { businessDate, lastNumber: 1 },
    update: { lastNumber: { increment: 1 } },
  });

  const order = await db.order.create({
    data: {
      orderNumber: counter.lastNumber,
      businessDate,
      customer: input.customer,
      phone: input.phone,
      type: input.type,
      status: "Pendiente",
      estimatedTime: null,
      total,
      items: { create: input.items.map(i => ({ name: i.name, qty: i.qty, price: i.price })) },
    },
    include: { items: true },
  });
  return toDTO(order);
}

// Lista todos los pedidos, más nuevo primero (mismo orden que ya usa la app en memoria).
export async function listOrders(): Promise<OrderDTO[]> {
  const orders = await db.order.findMany({ include: { items: true }, orderBy: { createdAt: "desc" } });
  return orders.map(toDTO);
}

// Busca un único pedido por su número visible ("007") o por teléfono (comparado sin
// separadores). Nunca devuelve el listado completo — es el endpoint público que reemplaza el
// filtro client-side que antes hacía CustomerTracking sobre todos los pedidos que recibía por
// props.
// OJO: orderNumber ya no es único globalmente (se reinicia cada jornada comercial), así que una
// búsqueda solo por número puede tener más de un pedido candidato en toda la historia — de
// forma interina se devuelve el más reciente (mayor businessDate). Pendiente (a propósito, para
// la rama "cliente"): restringir esta búsqueda a la jornada comercial actual únicamente, para
// que un número de un día anterior nunca aparezca como resultado de "hoy".
export async function lookupOrder(params: { orderNumber?: string; phone?: string }): Promise<OrderDTO | null> {
  if (params.orderNumber) {
    const orderNumber = Number(params.orderNumber);
    if (!Number.isInteger(orderNumber)) return null;
    const order = await db.order.findFirst({
      where: { orderNumber },
      orderBy: { businessDate: "desc" },
      include: { items: true },
    });
    return order ? toDTO(order) : null;
  }

  if (params.phone) {
    const normalized = params.phone.replace(/\D/g, "");
    const orders = await db.order.findMany({ include: { items: true }, orderBy: { createdAt: "desc" } });
    const match = orders.find(o => o.phone.replace(/\D/g, "") === normalized);
    return match ? toDTO(match) : null;
  }

  return null;
}

// Actualiza el estado y/o el horario de un pedido existente, buscado por su id real (uuid) — no
// por orderNumber, que puede repetirse entre jornadas distintas y ya no alcanza para identificar
// un pedido puntual sin ambigüedad. Asignar un horario implica pasar a "Programado", igual que
// hace assignTime hoy en App.tsx. Pasar a "Entregado" registra deliveredAt (el momento real de
// la entrega, no el de creación) para poder distinguir "entregado hoy" de "entregado en algún
// momento" del lado del frontend.
export async function updateOrder(id: string, patch: UpdateOrderInput): Promise<OrderDTO> {
  const existing = await db.order.findUnique({ where: { id } });
  if (!existing) throw new OrderNotFoundError(id);

  const data = patch.estimatedTime !== undefined
    ? { estimatedTime: patch.estimatedTime, status: "Programado" }
    : { status: patch.status, ...(patch.status === "Entregado" ? { deliveredAt: new Date() } : {}) };

  const order = await db.order.update({ where: { id }, data, include: { items: true } });
  return toDTO(order);
}
