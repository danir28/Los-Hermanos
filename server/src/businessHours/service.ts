import { db } from "../db.js";
import { argentinaWallTimeToUtc, businessDayFor } from "../orders/businessDay.js";
import type { BusinessHoursDTO, DaySchedule } from "./types.js";

export class InvalidBusinessHoursError extends Error {
  constructor(reason: string) {
    super(`Horario inválido: ${reason}`);
    this.name = "InvalidBusinessHoursError";
  }
}

const TIME_FORMAT = /^([01]\d|2[0-3]):[0-5]\d$/;

// Valida que vengan exactamente los 7 días de la semana (0-6), sin repetidos, con
// openTime/closeTime en formato "HH:mm" — lo que espera PUT /api/business-hours.
function assertValidDays(days: DaySchedule[]): void {
  if (days.length !== 7) throw new InvalidBusinessHoursError("hacen falta los 7 días de la semana");
  const seen = new Set<number>();
  for (const day of days) {
    if (!Number.isInteger(day.dayOfWeek) || day.dayOfWeek < 0 || day.dayOfWeek > 6) {
      throw new InvalidBusinessHoursError(`"dayOfWeek" inválido: ${day.dayOfWeek}`);
    }
    if (seen.has(day.dayOfWeek)) throw new InvalidBusinessHoursError(`día ${day.dayOfWeek} repetido`);
    seen.add(day.dayOfWeek);
    if (!TIME_FORMAT.test(day.openTime) || !TIME_FORMAT.test(day.closeTime)) {
      throw new InvalidBusinessHoursError('"openTime"/"closeTime" deben tener formato "HH:mm"');
    }
  }
}

// Determina si el local está abierto en `date`, según el horario configurado para el día de
// la semana de su jornada comercial (no el día calendario: ver businessDayFor, la rotisería
// cierra pasada la medianoche). Si closeTime <= openTime, el cierre se interpreta cruzando la
// medianoche (ej. 19:00 a 02:00), mismo criterio con el que ya opera el local hoy.
function isOpenAt(date: Date, days: DaySchedule[]): boolean {
  const businessDate = businessDayFor(date);
  const dayOfWeek = businessDate.getUTCDay();
  const schedule = days.find(d => d.dayOfWeek === dayOfWeek);
  if (!schedule || !schedule.isOpen) return false;

  const [openHours, openMinutes] = schedule.openTime.split(":").map(Number);
  const [closeHours, closeMinutes] = schedule.closeTime.split(":").map(Number);
  const openAt = argentinaWallTimeToUtc(businessDate, openHours, openMinutes);
  let closeAt = argentinaWallTimeToUtc(businessDate, closeHours, closeMinutes);
  if (closeAt.getTime() <= openAt.getTime()) closeAt = new Date(closeAt.getTime() + 24 * 3_600_000);

  return date.getTime() >= openAt.getTime() && date.getTime() < closeAt.getTime();
}

async function readDays(): Promise<DaySchedule[]> {
  const rows = await db.businessHours.findMany({ orderBy: { dayOfWeek: "asc" } });
  return rows.map(r => ({ dayOfWeek: r.dayOfWeek, isOpen: r.isOpen, openTime: r.openTime, closeTime: r.closeTime }));
}

// Trae el horario completo de la semana más si el local está abierto ahora mismo.
export async function getBusinessHours(): Promise<BusinessHoursDTO> {
  const days = await readDays();
  return { days, isOpenNow: isOpenAt(new Date(), days) };
}

// Reemplaza el horario de los 7 días (siempre se manda la semana completa, no un patch
// parcial, para no dejar días a mitad de editar con datos inconsistentes).
export async function updateBusinessHours(days: DaySchedule[]): Promise<BusinessHoursDTO> {
  assertValidDays(days);
  await db.$transaction(
    days.map(d => db.businessHours.upsert({
      where: { dayOfWeek: d.dayOfWeek },
      create: d,
      update: { isOpen: d.isOpen, openTime: d.openTime, closeTime: d.closeTime },
    }))
  );
  return getBusinessHours();
}

// Usada por orders/service.ts para bloquear el checkout online fuera de horario.
export async function isBusinessOpenNow(): Promise<boolean> {
  const days = await readDays();
  return isOpenAt(new Date(), days);
}
