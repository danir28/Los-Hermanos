import { describe, expect, it } from "vitest";
import { businessDayFor } from "./businessDay.js";
import {
  InvalidSlotError,
  SLOT_CAPACITY,
  SLOT_RANGE_END,
  SLOT_RANGE_START,
  assertValidSlotOrThrow,
  generateSlots,
  isSlotInRange,
  isSlotTooSoon,
} from "./slots.js";

describe("generateSlots", () => {
  it(`genera exactamente 48 turnos, de ${SLOT_RANGE_START} a ${SLOT_RANGE_END} cada 5 minutos`, () => {
    const slots = generateSlots();
    expect(slots).toHaveLength(48);
    expect(slots[0]).toBe(SLOT_RANGE_START);
    expect(slots.at(-1)).toBe(SLOT_RANGE_END);
  });
});

describe("isSlotInRange", () => {
  it("acepta los dos extremos del rango, inclusive", () => {
    expect(isSlotInRange(SLOT_RANGE_START)).toBe(true);
    expect(isSlotInRange(SLOT_RANGE_END)).toBe(true);
  });

  it("rechaza un horario fuera de rango", () => {
    expect(isSlotInRange("18:55")).toBe(false);
    expect(isSlotInRange("23:00")).toBe(false);
  });

  it("rechaza un horario en rango pero no alineado al paso de 5 minutos", () => {
    expect(isSlotInRange("19:03")).toBe(false);
  });
});

describe("isSlotTooSoon", () => {
  const businessDate = businessDayFor(new Date("2026-07-18T12:00:00.000Z"));

  it("un turno exactamente al borde de MIN_LEAD_MINUTES ya no es 'muy pronto'", () => {
    const now = new Date("2026-07-18T22:00:00.000Z"); // 19:00 ART
    // 19:20 ART = 22:20 UTC, exactamente 20 minutos después de "now"
    expect(isSlotTooSoon("19:20", businessDate, now)).toBe(false);
  });

  it("un turno un segundo antes de ese borde sí es 'muy pronto'", () => {
    const now = new Date("2026-07-18T22:00:01.000Z"); // 1s después de las 19:00 ART
    expect(isSlotTooSoon("19:20", businessDate, now)).toBe(true);
  });

  it("el propio turno actual (0 minutos de anticipación) siempre es 'muy pronto'", () => {
    const now = new Date("2026-07-18T22:00:00.000Z");
    expect(isSlotTooSoon("19:00", businessDate, now)).toBe(true);
  });
});

describe("assertValidSlotOrThrow", () => {
  const businessDate = businessDayFor(new Date("2026-07-18T12:00:00.000Z"));
  const now = new Date("2026-07-18T12:00:00.000Z"); // bien temprano, cualquier turno da tiempo de sobra

  it("no tira nada con un turno válido", () => {
    expect(() => assertValidSlotOrThrow("19:00", businessDate, now)).not.toThrow();
  });

  it("valida el formato antes que el rango", () => {
    expect(() => assertValidSlotOrThrow("9:00", businessDate, now)).toThrow(InvalidSlotError);
    expect(() => assertValidSlotOrThrow("9:00", businessDate, now)).toThrow(/formato/);
  });

  it("valida el rango antes que la anticipación", () => {
    expect(() => assertValidSlotOrThrow("23:00", businessDate, now)).toThrow(/entre/);
  });

  it("valida la anticipación mínima al final, con un turno en rango y bien formado", () => {
    const nowJustBefore = new Date("2026-07-18T22:00:01.000Z"); // 1s después de las 19:00 ART
    expect(() => assertValidSlotOrThrow("19:20", businessDate, nowJustBefore)).toThrow(/anticipación/);
  });
});

describe("SLOT_CAPACITY", () => {
  it("está definida como un entero positivo (guardrail: los tests de concurrencia de orders/service.ts asumen esto)", () => {
    expect(Number.isInteger(SLOT_CAPACITY)).toBe(true);
    expect(SLOT_CAPACITY).toBeGreaterThan(0);
  });
});
