import { describe, expect, it } from "vitest";
import { assertValidDays, InvalidBusinessHoursError } from "./service.js";
import type { DaySchedule } from "./types.js";

// Arranca de un horario simple y válido para los 7 días (domingo cerrado, resto igual), así cada
// test solo pisa el día que le interesa en vez de repetir las 7 entradas a mano.
function weekWith(dayOfWeek: number, patch: Partial<DaySchedule>): DaySchedule[] {
  return Array.from({ length: 7 }, (_, i) => ({
    dayOfWeek: i,
    isOpen: i !== 0,
    ranges: i === 0 ? [] : [{ openTime: "10:00", closeTime: "23:00" }],
    ...(i === dayOfWeek ? patch : {}),
  }));
}

describe("assertValidDays — franjas horarias por día", () => {
  it("acepta franjas separadas por un hueco real (horario partido válido)", () => {
    const days = weekWith(1, { ranges: [{ openTime: "10:30", closeTime: "13:30" }, { openTime: "19:00", closeTime: "23:30" }] });
    expect(() => assertValidDays(days)).not.toThrow();
  });

  it("acepta las franjas en cualquier orden de entrada (no depende de que ya vengan ordenadas)", () => {
    const days = weekWith(1, { ranges: [{ openTime: "19:00", closeTime: "23:30" }, { openTime: "10:30", closeTime: "13:30" }] });
    expect(() => assertValidDays(days)).not.toThrow();
  });

  it("rechaza franjas que se superponen", () => {
    const days = weekWith(1, { ranges: [{ openTime: "10:30", closeTime: "13:30" }, { openTime: "12:00", closeTime: "20:00" }] });
    expect(() => assertValidDays(days)).toThrow(InvalidBusinessHoursError);
  });

  it("rechaza franjas que se tocan justo en el límite (una termina cuando la otra empieza)", () => {
    const days = weekWith(1, { ranges: [{ openTime: "10:30", closeTime: "13:30" }, { openTime: "13:30", closeTime: "20:00" }] });
    expect(() => assertValidDays(days)).toThrow(InvalidBusinessHoursError);
  });

  it("rechaza un día abierto sin ninguna franja", () => {
    const days = weekWith(1, { ranges: [] });
    expect(() => assertValidDays(days)).toThrow(InvalidBusinessHoursError);
  });

  it("rechaza formato de hora inválido", () => {
    const days = weekWith(1, { ranges: [{ openTime: "25:00", closeTime: "10:00" }] });
    expect(() => assertValidDays(days)).toThrow(InvalidBusinessHoursError);
  });

  it("una franja que cruza la medianoche no se considera superpuesta con una franja temprana del mismo día", () => {
    // 19:00 a 02:00 (cruza medianoche) y 10:00 a 13:00 no se tocan en la línea de tiempo real.
    const days = weekWith(1, { ranges: [{ openTime: "19:00", closeTime: "02:00" }, { openTime: "10:00", closeTime: "13:00" }] });
    expect(() => assertValidDays(days)).not.toThrow();
  });
});
