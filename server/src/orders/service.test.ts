import { randomUUID } from "node:crypto";
import { afterAll, afterEach, beforeEach, describe, expect, it } from "vitest";
import { resetDb } from "../../tests/helpers/resetDb.js";
import { db } from "../db.js";
import { argentinaWallTimeToUtc, businessDayFor } from "./businessDay.js";
import { OrderNotFoundError, advanceScheduledOrders, createOrder, lookupOrder, updateOrder } from "./service.js";
import { MIN_LEAD_MINUTES, SLOT_CAPACITY, SlotFullError } from "./slots.js";

// La ventana de retiro ahora es editable por cocina, por día de la semana (ver
// server/src/slotWindows/) — ya no son constantes que se puedan importar de slots.ts. Estos
// valores reflejan lo que siembra la migración de esa tabla (20260726173034_add_slot_windows,
// 19:00 a 22:55 los 7 días) y con lo que arranca la base de test. No se consultan por DB acá a
// propósito: `slot` (más abajo) se calcula a nivel de módulo para poder usarse en
// `describe.skipIf`, que necesita el valor de forma síncrona antes de que corra ningún hook.
const TEST_SLOT_WINDOW_START = "19:00";
const TEST_SLOT_WINDOW_END = "22:55";

// createOrder/updateOrder validan el turno contra el reloj real (businessDayFor(new Date()),
// sin "now" inyectable) — así que estos tests calculan un turno realmente elegible AHORA, en vez
// de hardcodear "19:00", que podría ya haber pasado si esto corre de noche. Si no queda ningún
// turno elegible hoy (ej. corriendo después de ~22:45 ART), los tests que dependen de esto se
// saltean explícitamente en vez de fallar de forma no determinística según la hora del día.
function usableSlotForToday(bufferMinutes = MIN_LEAD_MINUTES + 10): string | null {
  const ARGENTINA_OFFSET_MS = -3 * 60 * 60 * 1000;
  const target = new Date(Date.now() + bufferMinutes * 60_000 + ARGENTINA_OFFSET_MS);
  let minutes = Math.ceil((target.getUTCHours() * 60 + target.getUTCMinutes()) / 5) * 5;

  const [startH, startM] = TEST_SLOT_WINDOW_START.split(":").map(Number);
  const [endH, endM] = TEST_SLOT_WINDOW_END.split(":").map(Number);
  const startMinutes = startH * 60 + startM;
  const endMinutes = endH * 60 + endM;

  if (minutes < startMinutes) minutes = startMinutes;
  if (minutes > endMinutes) return null;

  const hh = String(Math.floor(minutes / 60)).padStart(2, "0");
  const mm = String(minutes % 60).padStart(2, "0");
  return `${hh}:${mm}`;
}

const slot = usableSlotForToday();
const items = [{ name: "Empanada de carne", qty: 2, price: 1500 }];

// beforeEach (no solo afterEach): esto garantiza arrancar cada test con la base realmente en
// cero, sin importar qué haya quedado de afuera de este archivo — ej. pedidos reales que dejan
// los specs de Playwright (tests/e2e/), que nunca se borran solos y podían coincidir con el
// mismo turno que usa el test de concurrencia de acá, haciendo que el cupo pareciera lleno antes
// de que este archivo creara un solo pedido.
beforeEach(resetDb);
afterEach(resetDb);
afterAll(async () => {
  await db.$disconnect();
});

describe.skipIf(!slot)("createOrder — capacidad de turnos (requiere Postgres real por el lock de OrderCounter)", () => {
  it(`acepta como máximo SLOT_CAPACITY (${SLOT_CAPACITY}) pedidos concurrentes en el mismo turno`, async () => {
    const attempts = SLOT_CAPACITY + 2;
    const results = await Promise.allSettled(
      Array.from({ length: attempts }, (_, i) =>
        createOrder({
          customer: `Cliente Concurrencia ${i}`,
          phone: `1111100000${i}`,
          items,
          type: "presencial",
          estimatedTime: slot!,
        })
      )
    );

    const fulfilled = results.filter(r => r.status === "fulfilled");
    const rejected = results.filter((r): r is PromiseRejectedResult => r.status === "rejected");
    expect(fulfilled).toHaveLength(SLOT_CAPACITY);
    expect(rejected).toHaveLength(attempts - SLOT_CAPACITY);
    for (const r of rejected) {
      expect(r.reason).toBeInstanceOf(SlotFullError);
    }
  });
});

describe("createOrder — numeración", () => {
  it("asigna orderNumbers consecutivos y sin duplicados bajo creación concurrente", async () => {
    const attempts = 6;
    const results = await Promise.all(
      Array.from({ length: attempts }, (_, i) =>
        createOrder({ customer: `Cliente Numeración ${i}`, phone: `2222200000${i}`, items, type: "presencial" })
      )
    );
    const numbers = results.map(o => Number(o.orderNumber)).sort((a, b) => a - b);
    expect(new Set(numbers).size).toBe(attempts);
    expect(numbers.at(-1)! - numbers[0] + 1).toBe(attempts);
  });
});

describe("createOrder — fallback sin horario", () => {
  it('nace "Pendiente" sin estimatedTime si no se elige turno', async () => {
    const order = await createOrder({ customer: "Cliente Sin Horario", phone: "33333000001", items, type: "telefónico" });
    expect(order.status).toBe("Pendiente");
    expect(order.estimatedTime).toBeNull();
  });
});

describe.skipIf(!slot)("updateOrder — reprogramación", () => {
  it("permite reprogramar un pedido a SU PROPIO turno actual aunque el turno esté a capacidad completa", async () => {
    const order = await createOrder({
      customer: "Cliente Reprogramación",
      phone: "444440000001",
      items,
      type: "presencial",
      estimatedTime: slot!,
    });
    // Llena el resto del cupo del turno con otros pedidos.
    for (let i = 0; i < SLOT_CAPACITY - 1; i++) {
      await createOrder({ customer: `Relleno ${i}`, phone: `555550000${i}`, items, type: "presencial", estimatedTime: slot! });
    }
    // El turno ya está a SLOT_CAPACITY, pero reprogramar el pedido a su propio turno debe
    // excluirlo a sí mismo del conteo (ver el `id: { not: id }` de updateOrder) y no tirar SlotFullError.
    const updated = await updateOrder(order.id, { estimatedTime: slot! });
    expect(updated.estimatedTime).toBe(slot);
  });

  it("tira OrderNotFoundError con un id inexistente", async () => {
    await expect(updateOrder(randomUUID(), { status: "Cancelado" })).rejects.toThrow(OrderNotFoundError);
  });

  it('registra deliveredAt al pasar a "Entregado"', async () => {
    const order = await createOrder({ customer: "Cliente Entrega", phone: "66666000001", items, type: "presencial" });
    const updated = await updateOrder(order.id, { status: "Entregado" });
    expect(updated.deliveredAt).not.toBeNull();
  });
});

describe("lookupOrder", () => {
  it("no cruza el mismo orderNumber entre jornadas comerciales distintas", async () => {
    const order = await createOrder({ customer: "Cliente Lookup", phone: "77777000001", items, type: "presencial" });
    // Mueve el pedido a la jornada de ayer sin tocar el orderNumber — misma constraint
    // compuesta { businessDate, orderNumber } que usa lookupOrder.
    const yesterday = new Date(businessDayFor(new Date()).getTime() - 24 * 60 * 60 * 1000);
    await db.order.update({ where: { id: order.id }, data: { businessDate: yesterday } });

    expect(await lookupOrder({ orderNumber: order.orderNumber })).toBeNull();
  });

  it("busca por teléfono normalizando separadores", async () => {
    await createOrder({ customer: "Cliente Teléfono", phone: "11-2345-6789", items, type: "presencial" });
    const found = await lookupOrder({ phone: "1123456789" });
    expect(found?.phone).toBe("11-2345-6789");
  });
});

describe("advanceScheduledOrders", () => {
  it('avanza "Programado" a "En preparación" cuando falta 15 minutos (dentro de PREP_LEAD_MINUTES=20) para el turno', async () => {
    const businessDate = businessDayFor(new Date());
    const order = await db.order.create({
      data: {
        orderNumber: 9001,
        businessDate,
        customer: "Cliente Barrido Prep",
        phone: "888880000001",
        type: "presencial",
        status: "Programado",
        estimatedTime: "20:00",
        total: 1500,
        items: { create: [{ name: "Empanada", qty: 1, price: 1500 }] },
      },
    });

    const slotUtc = argentinaWallTimeToUtc(businessDate, 20, 0);
    const now = new Date(slotUtc.getTime() - 15 * 60_000);
    await advanceScheduledOrders(now);

    const refreshed = await db.order.findUnique({ where: { id: order.id } });
    expect(refreshed?.status).toBe("En preparación");
  });

  it('nunca toca un pedido "Cancelado" aunque su horario ya haya pasado', async () => {
    const order = await db.order.create({
      data: {
        orderNumber: 9002,
        businessDate: businessDayFor(new Date()),
        customer: "Cliente Barrido Cancelado",
        phone: "888880000002",
        type: "presencial",
        status: "Cancelado",
        estimatedTime: "19:00",
        total: 1500,
        items: { create: [{ name: "Empanada", qty: 1, price: 1500 }] },
      },
    });

    await advanceScheduledOrders(new Date(Date.now() + 6 * 60 * 60_000));

    const refreshed = await db.order.findUnique({ where: { id: order.id } });
    expect(refreshed?.status).toBe("Cancelado");
  });
});
