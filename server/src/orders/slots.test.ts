import { describe, expect, it } from "vitest";
import { businessDayFor } from "./businessDay.js";
import {
  InvalidSlotError,
  SLOT_CAPACITY,
  assertValidSlotOrThrow,
  generateSlots,
  isSlotInRange,
  isSlotTooSoon,
} from "./slots.js";

// Franjas de ejemplo para las funciones puras de este archivo — desde que la ventana real pasó
// a ser editable por cocina, con franjas múltiples (ver server/src/slotWindows/), estas
// funciones ya no leen un rango hardcodeado, lo reciben como parámetro. Estos tests solo
// verifican el comportamiento genérico (inclusión de extremos, alineación al paso, horario
// partido, etc.), no un valor de producción puntual — la validación de que cada franja caiga
// dentro del horario de atención del local vive en slotWindows/service.ts, no acá.
const RANGES = [{ startTime: "19:00", endTime: "22:55" }];
const SPLIT_RANGES = [{ startTime: "12:00", endTime: "14:00" }, { startTime: "19:30", endTime: "22:30" }];

describe("generateSlots", () => {
  it(`genera exactamente 48 turnos, de ${RANGES[0].startTime} a ${RANGES[0].endTime} cada 5 minutos`, () => {
    const slots = generateSlots(RANGES);
    expect(slots).toHaveLength(48);
    expect(slots[0]).toBe(RANGES[0].startTime);
    expect(slots.at(-1)).toBe(RANGES[0].endTime);
  });

  it("genera la cantidad correcta de turnos para una franja distinta", () => {
    const slots = generateSlots([{ startTime: "10:00", endTime: "10:20" }]);
    expect(slots).toEqual(["10:00", "10:05", "10:10", "10:15", "10:20"]);
  });

  it("con horario partido, junta los turnos de todas las franjas en orden cronológico", () => {
    const slots = generateSlots(SPLIT_RANGES);
    expect(slots[0]).toBe("12:00");
    expect(slots.at(-1)).toBe("22:30");
    expect(slots).not.toContain("14:05"); // el hueco entre franjas no genera turnos
    expect(slots).not.toContain("19:25");
  });

  it("sin ninguna franja configurada, no hay turnos", () => {
    expect(generateSlots([])).toEqual([]);
  });
});

describe("isSlotInRange", () => {
  it("acepta los dos extremos del rango, inclusive", () => {
    expect(isSlotInRange(RANGES[0].startTime, RANGES)).toBe(true);
    expect(isSlotInRange(RANGES[0].endTime, RANGES)).toBe(true);
  });

  it("rechaza un horario fuera de rango", () => {
    expect(isSlotInRange("18:55", RANGES)).toBe(false);
    expect(isSlotInRange("23:00", RANGES)).toBe(false);
  });

  it("rechaza un horario en rango pero no alineado al paso de 5 minutos", () => {
    expect(isSlotInRange("19:03", RANGES)).toBe(false);
  });

  it("con horario partido, acepta un turno de cualquiera de las franjas y rechaza el hueco entre ambas", () => {
    expect(isSlotInRange("12:30", SPLIT_RANGES)).toBe(true);
    expect(isSlotInRange("20:00", SPLIT_RANGES)).toBe(true);
    expect(isSlotInRange("15:00", SPLIT_RANGES)).toBe(false);
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
    expect(() => assertValidSlotOrThrow("19:00", RANGES, businessDate, now)).not.toThrow();
  });

  it("valida el formato antes que el rango", () => {
    expect(() => assertValidSlotOrThrow("9:00", RANGES, businessDate, now)).toThrow(InvalidSlotError);
    expect(() => assertValidSlotOrThrow("9:00", RANGES, businessDate, now)).toThrow(/formato/);
  });

  it("valida el rango antes que la anticipación", () => {
    expect(() => assertValidSlotOrThrow("23:00", RANGES, businessDate, now)).toThrow(/franjas/);
  });

  it("valida la anticipación mínima al final, con un turno en rango y bien formado", () => {
    const nowJustBefore = new Date("2026-07-18T22:00:01.000Z"); // 1s después de las 19:00 ART
    expect(() => assertValidSlotOrThrow("19:20", RANGES, businessDate, nowJustBefore)).toThrow(/anticipación/);
  });
});

describe("SLOT_CAPACITY", () => {
  it("está definida como un entero positivo (guardrail: los tests de concurrencia de orders/service.ts asumen esto)", () => {
    expect(Number.isInteger(SLOT_CAPACITY)).toBe(true);
    expect(SLOT_CAPACITY).toBeGreaterThan(0);
  });
});
