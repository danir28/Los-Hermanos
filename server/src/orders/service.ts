import { isBusinessOpenNow } from "../businessHours/service.js";
import { db } from "../db.js";
import type { Order, OrderItem } from "../generated/prisma/client.js";
import { getSlotWindowFor } from "../slotWindows/service.js";
import { argentinaWallTimeToUtc, businessDayFor } from "./businessDay.js";
import { assertValidSlotOrThrow, generateSlots, isSlotTooSoon, parseTime, SLOT_CAPACITY, SlotFullError } from "./slots.js";
import type { CreateOrderInput, OrderDTO, UpdateOrderInput } from "./types.js";

export class OrderNotFoundError extends Error {
  constructor(id: string) {
    super(`No existe el pedido #${id}`);
    this.name = "OrderNotFoundError";
  }
}

// Se intentó crear un pedido online fuera del horario de atención configurado (ver
// businessHours/service.ts#isBusinessOpenNow). Solo aplica a `type === "online"`: recepción
// puede seguir cargando pedidos manualmente sin esta restricción (decisión explícita del
// dueño del proyecto).
export class BusinessClosedError extends Error {
  constructor() {
    super("La rotisería está cerrada en este momento. Podés hacer tu pedido en el horario de atención.");
    this.name = "BusinessClosedError";
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

// Crea un pedido nuevo (online, presencial, telefónico), siempre con un turno de retiro elegido
// (input.estimatedTime, ver orders/slots.ts) — nace directamente "Programado" con ese horario.
// Ya no existe un fallback "sin horario" (ver CreateOrderInput): esa vía ya era inalcanzable
// desde toda la UI actual, que exige elegir un turno antes de dejar confirmar. El total se
// calcula a partir de los ítems recibidos. El número visible se asigna con un upsert atómico
// sobre OrderCounter (increment) — ese mismo upsert sirve de punto de serialización para el
// chequeo de cupo del turno: al quedar dentro de la misma transacción, el row-lock que toma
// protege ambas cosas, sin necesidad de un lock aparte.
export async function createOrder(input: CreateOrderInput): Promise<OrderDTO> {
  if (input.type === "online" && !(await isBusinessOpenNow())) {
    throw new BusinessClosedError();
  }

  const total = input.items.reduce((s, i) => s + i.price * i.qty, 0);
  const businessDate = businessDayFor(new Date());
  // Lectura simple, no necesita entrar a la transacción que sí tiene que serializarse (ver
  // comentario de arriba sobre el lock de OrderCounter).
  const slotRanges = await getSlotWindowFor(businessDate);

  const order = await db.$transaction(async (tx) => {
    const counter = await tx.orderCounter.upsert({
      where: { businessDate },
      create: { businessDate, lastNumber: 1 },
      update: { lastNumber: { increment: 1 } },
    });

    assertValidSlotOrThrow(input.estimatedTime, slotRanges, businessDate);
    const taken = await tx.order.count({
      where: { businessDate, estimatedTime: input.estimatedTime, status: { not: "Cancelado" } },
    });
    if (taken >= SLOT_CAPACITY) throw new SlotFullError(input.estimatedTime);

    return tx.order.create({
      data: {
        orderNumber: counter.lastNumber,
        businessDate,
        customer: input.customer,
        phone: input.phone,
        type: input.type,
        status: "Programado",
        estimatedTime: input.estimatedTime,
        total,
        items: { create: input.items.map(i => ({ name: i.name, qty: i.qty, price: i.price })) },
      },
      include: { items: true },
    });
  });
  return toDTO(order);
}

// Disponibilidad de cada turno de la jornada comercial dada (hoy por defecto): cuántos pedidos
// ya lo ocuparon, si ya está demasiado cerca para darle tiempo a cocina (o directamente pasado),
// y si todavía se puede elegir. La usa el SlotPicker del frontend (GET /api/orders/slots) para
// no dejar elegir un turno lleno o sin margen desde la UI, aunque el backend igual lo vuelve a
// validar en createOrder/updateOrder por las dudas.
export async function getSlotAvailability(businessDate: Date = businessDayFor(new Date())) {
  const slotRanges = await getSlotWindowFor(businessDate);
  const counts = await db.order.groupBy({
    by: ["estimatedTime"],
    where: { businessDate, estimatedTime: { not: null }, status: { not: "Cancelado" } },
    _count: true,
  });
  const takenBySlot = new Map(counts.map(c => [c.estimatedTime, c._count]));

  return generateSlots(slotRanges).map(time => {
    const taken = takenBySlot.get(time) ?? 0;
    const tooSoon = isSlotTooSoon(time, businessDate);
    return { time, taken, capacity: SLOT_CAPACITY, tooSoon, available: taken < SLOT_CAPACITY && !tooSoon };
  });
}

// Lista pedidos, más nuevo primero (mismo orden que ya usa la app en memoria).
// `onlyCurrentBusinessDay` restringe el resultado a la jornada comercial en curso (ver
// businessDayFor) — lo usa el router para recepción y admin (el dashboard de admin es "hoy",
// no el histórico completo; cocina sigue recibiendo todos los pedidos, sin este filtro).
export async function listOrders(options?: { onlyCurrentBusinessDay?: boolean }): Promise<OrderDTO[]> {
  const where = options?.onlyCurrentBusinessDay ? { businessDate: businessDayFor(new Date()) } : undefined;
  const orders = await db.order.findMany({ where, include: { items: true }, orderBy: { createdAt: "desc" } });
  return orders.map(toDTO);
}

// Busca un único pedido por su número visible ("007") o por teléfono (comparado sin
// separadores). Nunca devuelve el listado completo — es el endpoint público que reemplaza el
// filtro client-side que antes hacía CustomerTracking sobre todos los pedidos que recibía por
// props.
// orderNumber ya no es único globalmente (se reinicia cada jornada comercial), así que una
// búsqueda solo por número se restringe a la jornada comercial en curso (ver businessDayFor) —
// { businessDate, orderNumber } sí es único (@@unique en schema.prisma), así que esto es un
// findUnique real, no "el más reciente que matchee". Un pedido de una jornada anterior con el
// mismo número nunca aparece como resultado de "hoy": si hoy no hay ningún pedido con ese
// número, la búsqueda debe fallar (not-found), no resolver a uno viejo.
export async function lookupOrder(params: { orderNumber?: string; phone?: string }): Promise<OrderDTO | null> {
  if (params.orderNumber) {
    const orderNumber = Number(params.orderNumber);
    if (!Number.isInteger(orderNumber)) return null;
    const order = await db.order.findUnique({
      where: { businessDate_orderNumber: { businessDate: businessDayFor(new Date()), orderNumber } },
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

  // Asignar/reprogramar horario: misma validación de cupo que createOrder (formato, rango, no
  // pasado, máximo SLOT_CAPACITY), para que "Reprogramar" no pueda mandar un pedido a un turno
  // ya lleno y romper la garantía que resuelve el requerimiento de la tabla de horarios. Se
  // excluye el propio pedido del conteo (está reprogramando su propio turno, no compitiendo
  // contra sí mismo). Se usa la jornada comercial del pedido original (existing.businessDate),
  // no la de "ahora" — es lo correcto para reprogramar same-day, que es el caso real hoy.
  if (patch.estimatedTime !== undefined) {
    const slotRanges = await getSlotWindowFor(existing.businessDate);
    const order = await db.$transaction(async (tx) => {
      assertValidSlotOrThrow(patch.estimatedTime!, slotRanges, existing.businessDate);
      const taken = await tx.order.count({
        where: {
          businessDate: existing.businessDate,
          estimatedTime: patch.estimatedTime,
          status: { not: "Cancelado" },
          id: { not: id },
        },
      });
      if (taken >= SLOT_CAPACITY) throw new SlotFullError(patch.estimatedTime!);
      return tx.order.update({
        where: { id },
        data: { estimatedTime: patch.estimatedTime, status: "Programado" },
        include: { items: true },
      });
    });
    return toDTO(order);
  }

  const data = { status: patch.status, ...(patch.status === "Entregado" ? { deliveredAt: new Date() } : {}) };
  const order = await db.order.update({ where: { id }, data, include: { items: true } });
  return toDTO(order);
}

// Umbrales del avance automático de estados por horario (reunión del 24/7/2026): en cocina son
// muy puntuales con el horario que le asignan a cada pedido, así que no hace falta que nadie
// marque a mano "en preparación"/"listo para retirar"/"entregado" — se infieren del reloj. Solo
// DELIVERED_GRACE_MINUTES importa para el negocio real (da margen a que el cliente pase a
// buscarlo); PREP_LEAD_MINUTES es puramente cosmético, para que el seguimiento del cliente
// muestre un mensaje más preciso antes de que esté listo.
const PREP_LEAD_MINUTES = 20;   // "Programado" → "En preparación"
const READY_LEAD_MINUTES = 5;   // → "Listo para retirar"
const DELIVERED_GRACE_MINUTES = 15; // "Listo para retirar" → "Entregado"

// Barre los pedidos con horario asignado que todavía no llegaron a "Entregado"/"Cancelado" y
// avanza el estado de los que ya cruzaron su umbral de tiempo correspondiente, respecto al
// horario de retiro elegido (estimatedTime + businessDate, convertido a instante real con
// argentinaWallTimeToUtc). Pensada para correr periódicamente desde index.ts (ver
// setInterval), no para ser llamada desde una ruta HTTP. El botón manual "Marcar entregado" en
// recepción sigue disponible como respaldo — este barrido no le quita esa capacidad, solo hace
// que en el caso normal (puntual) nadie necesite tocarlo.
export async function advanceScheduledOrders(now: Date = new Date()): Promise<void> {
  const candidates = await db.order.findMany({
    where: { estimatedTime: { not: null }, status: { in: ["Programado", "En preparación", "Listo para retirar"] } },
  });

  const toPrep: string[] = [];
  const toReady: string[] = [];
  const toDelivered: string[] = [];

  for (const order of candidates) {
    const { hours, minutes } = parseTime(order.estimatedTime!);
    const slotUtc = argentinaWallTimeToUtc(order.businessDate, hours, minutes);
    const minutesUntilSlot = (slotUtc.getTime() - now.getTime()) / 60_000;

    if (order.status === "Listo para retirar") {
      if (-minutesUntilSlot >= DELIVERED_GRACE_MINUTES) toDelivered.push(order.id);
      continue;
    }
    // status es "Programado" o "En preparación": evalúa el umbral más avanzado primero para
    // que un pedido nunca pase dos veces por la misma jornada de barrido (ej. si el proceso
    // estuvo caído y el horario ya está encima, salta directo a "Listo para retirar").
    if (minutesUntilSlot <= READY_LEAD_MINUTES) {
      toReady.push(order.id);
    } else if (order.status === "Programado" && minutesUntilSlot <= PREP_LEAD_MINUTES) {
      toPrep.push(order.id);
    }
  }

  if (toPrep.length) await db.order.updateMany({ where: { id: { in: toPrep } }, data: { status: "En preparación" } });
  if (toReady.length) await db.order.updateMany({ where: { id: { in: toReady } }, data: { status: "Listo para retirar" } });
  if (toDelivered.length) await db.order.updateMany({ where: { id: { in: toDelivered } }, data: { status: "Entregado", deliveredAt: now } });
}
