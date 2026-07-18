import { db } from "../db.js";
import type { Order, OrderItem } from "../generated/prisma/client.js";
import type { CreateOrderInput, OrderDTO, UpdateOrderInput } from "./types.js";

export class OrderNotFoundError extends Error {
  constructor(id: string) {
    super(`No existe el pedido #${id}`);
    this.name = "OrderNotFoundError";
  }
}

type OrderWithItems = Order & { items: OrderItem[] };

// Formatea el correlativo interno (orderNumber) al id con padding que usa toda la UI ("001").
function toDisplayId(orderNumber: number): string {
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
function toDTO(order: OrderWithItems): OrderDTO {
  return {
    id: toDisplayId(order.orderNumber),
    customer: order.customer,
    phone: order.phone,
    items: order.items.map(i => ({ name: i.name, qty: i.qty, price: Number(i.price) })),
    status: order.status,
    createdAt: formatCreatedAt(order.createdAt),
    estimatedTime: order.estimatedTime,
    total: Number(order.total),
    type: order.type,
  };
}

// Crea un pedido nuevo (online, presencial, telefónico) con estado inicial "Pendiente" y
// sin horario asignado todavía; el total se calcula a partir de los ítems recibidos.
export async function createOrder(input: CreateOrderInput): Promise<OrderDTO> {
  const total = input.items.reduce((s, i) => s + i.price * i.qty, 0);
  const order = await db.order.create({
    data: {
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

// Busca un único pedido por su id visible ("007") o por teléfono (comparado sin
// separadores). Nunca devuelve el listado completo — es el endpoint público que
// reemplaza el filtro client-side que antes hacía CustomerTracking sobre todos los
// pedidos que recibía por props.
export async function lookupOrder(params: { orderNumber?: string; phone?: string }): Promise<OrderDTO | null> {
  if (params.orderNumber) {
    const orderNumber = Number(params.orderNumber);
    if (!Number.isInteger(orderNumber)) return null;
    const order = await db.order.findUnique({ where: { orderNumber }, include: { items: true } });
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

// Actualiza el estado y/o el horario de un pedido existente, buscado por su id visible ("007").
// Asignar un horario implica pasar a "Programado", igual que hace assignTime hoy en App.tsx.
export async function updateOrder(displayId: string, patch: UpdateOrderInput): Promise<OrderDTO> {
  const orderNumber = Number(displayId);
  const existing = await db.order.findUnique({ where: { orderNumber } });
  if (!existing) throw new OrderNotFoundError(displayId);

  const data = patch.estimatedTime !== undefined
    ? { estimatedTime: patch.estimatedTime, status: "Programado" }
    : { status: patch.status };

  const order = await db.order.update({ where: { orderNumber }, data, include: { items: true } });
  return toDTO(order);
}
