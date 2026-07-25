import { describe, expect, it } from "vitest";
import { argentinaWallTimeToUtc, businessDayFor } from "./businessDay.js";

describe("businessDayFor", () => {
  it("un instante a las 23:50 ART pertenece a la jornada del mismo día calendario", () => {
    // 2026-07-18 23:50 ART = 2026-07-19 02:50 UTC
    const date = new Date("2026-07-19T02:50:00.000Z");
    expect(businessDayFor(date).toISOString()).toBe("2026-07-18T00:00:00.000Z");
  });

  it("un instante a la 1:30 ART pertenece TODAVÍA a la jornada del día anterior", () => {
    // 2026-07-19 01:30 ART = 2026-07-19 04:30 UTC
    const date = new Date("2026-07-19T04:30:00.000Z");
    expect(businessDayFor(date).toISOString()).toBe("2026-07-18T00:00:00.000Z");
  });

  it("el borde exacto de las 7:00 ART ya pertenece a la nueva jornada", () => {
    // 2026-07-19 07:00:00.000 ART = 2026-07-19 10:00:00.000 UTC
    const date = new Date("2026-07-19T10:00:00.000Z");
    expect(businessDayFor(date).toISOString()).toBe("2026-07-19T00:00:00.000Z");
  });

  it("un milisegundo antes de las 7:00 ART todavía pertenece a la jornada anterior", () => {
    // 2026-07-19 06:59:59.999 ART = 2026-07-19 09:59:59.999 UTC
    const date = new Date("2026-07-19T09:59:59.999Z");
    expect(businessDayFor(date).toISOString()).toBe("2026-07-18T00:00:00.000Z");
  });

  it("cruza el límite de año correctamente", () => {
    // 2027-01-01 01:00 ART = 2027-01-01 04:00 UTC → jornada del 2026-12-31
    const date = new Date("2027-01-01T04:00:00.000Z");
    expect(businessDayFor(date).toISOString()).toBe("2026-12-31T00:00:00.000Z");
  });
});

describe("argentinaWallTimeToUtc", () => {
  it("convierte un horario de turno (19:00 ART) al instante UTC correcto del mismo día calendario", () => {
    const businessDate = businessDayFor(new Date("2026-07-18T12:00:00.000Z"));
    const slotUtc = argentinaWallTimeToUtc(businessDate, 19, 0);
    // 19:00 ART = 22:00 UTC (ART = UTC-3)
    expect(slotUtc.toISOString()).toBe("2026-07-18T22:00:00.000Z");
  });

  it("hace round-trip con businessDayFor para todo el rango real de turnos (19:00 a 22:55)", () => {
    const businessDate = businessDayFor(new Date("2026-07-18T12:00:00.000Z"));
    for (const [hours, minutes] of [[19, 0], [20, 30], [22, 55]]) {
      const slotUtc = argentinaWallTimeToUtc(businessDate, hours, minutes);
      expect(businessDayFor(slotUtc).getTime()).toBe(businessDate.getTime());
    }
  });
});
