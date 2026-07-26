import { describe, expect, it } from "vitest";
import type { DaySchedule as BusinessDaySchedule } from "../businessHours/types.js";
import { assertValidSlotWindowDays, InvalidSlotWindowError } from "./service.js";
import type { SlotTimeRange, SlotWindowDay } from "./types.js";

// Horario de atención generoso por defecto (09:00-23:00 todos los días), para que los tests de
// franjas de retiro no se vean afectados por el horario de atención salvo que el test
// explícitamente lo acote para probar la contención.
function generousBusinessWeek(): BusinessDaySchedule[] {
  return Array.from({ length: 7 }, (_, i) => ({
    dayOfWeek: i,
    isOpen: true,
    ranges: [{ openTime: "09:00", closeTime: "23:00" }],
  }));
}

// Semana de franjas de retiro con un valor por defecto (19:00-22:00) en los 6 días que no nos
// interesan, para que cada test solo pise el día que está probando.
function weekWith(dayOfWeek: number, ranges: SlotTimeRange[]): SlotWindowDay[] {
  return Array.from({ length: 7 }, (_, i) => ({
    dayOfWeek: i,
    ranges: i === dayOfWeek ? ranges : [{ startTime: "19:00", endTime: "22:00" }],
  }));
}

describe("assertValidSlotWindowDays — formato y estructura", () => {
  it("acepta una franja válida dentro del horario de atención", () => {
    const days = weekWith(1, [{ startTime: "19:00", endTime: "22:00" }]);
    expect(() => assertValidSlotWindowDays(days, generousBusinessWeek())).not.toThrow();
  });

  it("acepta un día sin ninguna franja de retiro (no ofrece turnos ese día)", () => {
    const days = weekWith(1, []);
    expect(() => assertValidSlotWindowDays(days, generousBusinessWeek())).not.toThrow();
  });

  it("rechaza que falten días", () => {
    const days = weekWith(1, [{ startTime: "19:00", endTime: "22:00" }]).slice(0, 6);
    expect(() => assertValidSlotWindowDays(days, generousBusinessWeek())).toThrow(InvalidSlotWindowError);
  });

  it("rechaza un día repetido", () => {
    const days = weekWith(1, [{ startTime: "19:00", endTime: "22:00" }]);
    days[6] = { ...days[6], dayOfWeek: 1 };
    expect(() => assertValidSlotWindowDays(days, generousBusinessWeek())).toThrow(InvalidSlotWindowError);
  });

  it("rechaza formato de hora inválido", () => {
    const days = weekWith(1, [{ startTime: "25:00", endTime: "22:00" }]);
    expect(() => assertValidSlotWindowDays(days, generousBusinessWeek())).toThrow(InvalidSlotWindowError);
  });

  it("rechaza startTime igual o posterior a endTime (no puede cruzar la medianoche)", () => {
    const days = weekWith(1, [{ startTime: "22:00", endTime: "19:00" }]);
    expect(() => assertValidSlotWindowDays(days, generousBusinessWeek())).toThrow(InvalidSlotWindowError);
  });

  it("rechaza franjas de retiro que se superponen entre sí", () => {
    const days = weekWith(1, [{ startTime: "19:00", endTime: "21:00" }, { startTime: "20:00", endTime: "22:00" }]);
    expect(() => assertValidSlotWindowDays(days, generousBusinessWeek())).toThrow(InvalidSlotWindowError);
  });

  it("rechaza franjas de retiro que se tocan en el límite exacto", () => {
    const days = weekWith(1, [{ startTime: "19:00", endTime: "20:00" }, { startTime: "20:00", endTime: "22:00" }]);
    expect(() => assertValidSlotWindowDays(days, generousBusinessWeek())).toThrow(InvalidSlotWindowError);
  });
});

describe("assertValidSlotWindowDays — contención dentro del horario de atención", () => {
  it("rechaza una franja que termina después de que cierra el local", () => {
    const business: BusinessDaySchedule[] = generousBusinessWeek();
    business[1] = { dayOfWeek: 1, isOpen: true, ranges: [{ openTime: "10:00", closeTime: "20:00" }] };
    const days = weekWith(1, [{ startTime: "19:00", endTime: "22:00" }]);
    expect(() => assertValidSlotWindowDays(days, business)).toThrow(/horario de atención/);
  });

  it("rechaza una franja que arranca antes de que abre el local", () => {
    const business: BusinessDaySchedule[] = generousBusinessWeek();
    business[1] = { dayOfWeek: 1, isOpen: true, ranges: [{ openTime: "19:00", closeTime: "23:00" }] };
    const days = weekWith(1, [{ startTime: "18:00", endTime: "20:00" }]);
    expect(() => assertValidSlotWindowDays(days, business)).toThrow(/horario de atención/);
  });

  it("rechaza cualquier franja de retiro en un día que el local tiene cerrado", () => {
    const business: BusinessDaySchedule[] = generousBusinessWeek();
    business[1] = { dayOfWeek: 1, isOpen: false, ranges: [] };
    const days = weekWith(1, [{ startTime: "19:00", endTime: "20:00" }]);
    expect(() => assertValidSlotWindowDays(days, business)).toThrow(/horario de atención/);
  });

  it("acepta horario partido: cada franja de retiro anidada en su propia franja de atención", () => {
    const business: BusinessDaySchedule[] = generousBusinessWeek();
    business[1] = {
      dayOfWeek: 1,
      isOpen: true,
      ranges: [{ openTime: "11:30", closeTime: "14:30" }, { openTime: "19:00", closeTime: "23:00" }],
    };
    const days = weekWith(1, [{ startTime: "12:00", endTime: "14:00" }, { startTime: "19:30", endTime: "22:30" }]);
    expect(() => assertValidSlotWindowDays(days, business)).not.toThrow();
  });

  it("rechaza una franja de retiro que \"salta\" el hueco entre dos franjas de atención partidas", () => {
    const business: BusinessDaySchedule[] = generousBusinessWeek();
    business[1] = {
      dayOfWeek: 1,
      isOpen: true,
      ranges: [{ openTime: "11:30", closeTime: "14:30" }, { openTime: "19:00", closeTime: "23:00" }],
    };
    // 13:00 a 20:00 no está contenida COMPLETAMENTE en ninguna de las dos franjas de atención,
    // aunque se superponga parcialmente con ambas.
    const days = weekWith(1, [{ startTime: "13:00", endTime: "20:00" }]);
    expect(() => assertValidSlotWindowDays(days, business)).toThrow(/horario de atención/);
  });

  it("acepta una franja de retiro anidada en una franja de atención que cruza la medianoche", () => {
    const business: BusinessDaySchedule[] = generousBusinessWeek();
    business[1] = { dayOfWeek: 1, isOpen: true, ranges: [{ openTime: "19:00", closeTime: "02:00" }] };
    const days = weekWith(1, [{ startTime: "19:30", endTime: "23:00" }]);
    expect(() => assertValidSlotWindowDays(days, business)).not.toThrow();
  });
});
