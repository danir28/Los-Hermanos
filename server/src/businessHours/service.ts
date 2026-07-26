import { db } from "../db.js";
import type { Prisma } from "../generated/prisma/client.js";
import { argentinaWallTimeToUtc, businessDayFor } from "../orders/businessDay.js";
import type { BusinessHoursDTO, DaySchedule, TimeRange } from "./types.js";

export class InvalidBusinessHoursError extends Error {
  constructor(reason: string) {
    super(`Horario inválido: ${reason}`);
    this.name = "InvalidBusinessHoursError";
  }
}

const TIME_FORMAT = /^([01]\d|2[0-3]):[0-5]\d$/;

function toMinutes(time: string): number {
  const [hours, minutes] = time.split(":").map(Number);
  return hours * 60 + minutes;
}

// Minuto en que termina una franja, en la misma línea de tiempo continua que su apertura — si
// closeTime <= openTime (cruza la medianoche, ej. 19:00 a 02:00) se le suman 24hs, mismo
// criterio que isWithinRange más abajo usa para el instante real.
function rangeEndMinutes(range: TimeRange): number {
  const open = toMinutes(range.openTime);
  const close = toMinutes(range.closeTime);
  return close <= open ? close + 24 * 60 : close;
}

// Rechaza franjas que se superponen o que se tocan en el límite exacto (ej. una termina a las
// 13:30 y la siguiente arranca justo a las 13:30) — tienen que estar separadas por un hueco real,
// ni una minúscula superposición ni un empalme perfecto son válidos. Ordena por apertura primero
// para no depender de en qué orden las mandó el frontend.
function assertNoOverlaps(dayOfWeek: number, ranges: TimeRange[]): void {
  const sorted = [...ranges].sort((a, b) => toMinutes(a.openTime) - toMinutes(b.openTime));
  for (let i = 1; i < sorted.length; i++) {
    const previousEnd = rangeEndMinutes(sorted[i - 1]);
    const currentStart = toMinutes(sorted[i].openTime);
    if (currentStart <= previousEnd) {
      throw new InvalidBusinessHoursError(`las franjas horarias del día ${dayOfWeek} se superponen o se tocan entre sí`);
    }
  }
}

// Valida que vengan exactamente los 7 días de la semana (0-6), sin repetidos, cada uno con
// `ranges` en formato "HH:mm" — lo que espera PUT /api/business-hours. Un día abierto necesita
// al menos una franja; uno cerrado debe mandar `ranges: []` (no tiene sentido guardar horarios
// "fantasma" de un día que no abre). Exportada (no solo usada internamente) para poder testear
// las reglas de validación sin pasar por la base de datos.
export function assertValidDays(days: DaySchedule[]): void {
  if (days.length !== 7) throw new InvalidBusinessHoursError("hacen falta los 7 días de la semana");
  const seen = new Set<number>();
  for (const day of days) {
    if (!Number.isInteger(day.dayOfWeek) || day.dayOfWeek < 0 || day.dayOfWeek > 6) {
      throw new InvalidBusinessHoursError(`"dayOfWeek" inválido: ${day.dayOfWeek}`);
    }
    if (seen.has(day.dayOfWeek)) throw new InvalidBusinessHoursError(`día ${day.dayOfWeek} repetido`);
    seen.add(day.dayOfWeek);
    if (!Array.isArray(day.ranges)) {
      throw new InvalidBusinessHoursError(`"ranges" debe ser un array (día ${day.dayOfWeek})`);
    }
    if (day.isOpen && day.ranges.length === 0) {
      throw new InvalidBusinessHoursError(`el día ${day.dayOfWeek} está abierto pero no tiene ninguna franja horaria`);
    }
    for (const range of day.ranges) {
      if (!TIME_FORMAT.test(range.openTime) || !TIME_FORMAT.test(range.closeTime)) {
        throw new InvalidBusinessHoursError(`"openTime"/"closeTime" deben tener formato "HH:mm" (día ${day.dayOfWeek})`);
      }
    }
    assertNoOverlaps(day.dayOfWeek, day.ranges);
  }
}

// Determina si `date` cae dentro de una franja puntual, dado el día de la jornada comercial al
// que pertenece. Si closeTime <= openTime, la franja se interpreta cruzando la medianoche (ej.
// 19:00 a 02:00), mismo criterio con el que ya opera el local hoy.
function isWithinRange(date: Date, businessDate: Date, range: TimeRange): boolean {
  const [openHours, openMinutes] = range.openTime.split(":").map(Number);
  const [closeHours, closeMinutes] = range.closeTime.split(":").map(Number);
  const openAt = argentinaWallTimeToUtc(businessDate, openHours, openMinutes);
  let closeAt = argentinaWallTimeToUtc(businessDate, closeHours, closeMinutes);
  if (closeAt.getTime() <= openAt.getTime()) closeAt = new Date(closeAt.getTime() + 24 * 3_600_000);

  return date.getTime() >= openAt.getTime() && date.getTime() < closeAt.getTime();
}

// Determina si el local está abierto en `date`, según el horario configurado para el día de
// la semana de su jornada comercial (no el día calendario: ver businessDayFor, la rotisería
// cierra pasada la medianoche). Un día puede tener varias franjas (horario partido); alcanza
// con que `date` caiga dentro de una sola.
function isOpenAt(date: Date, days: DaySchedule[]): boolean {
  const businessDate = businessDayFor(date);
  const dayOfWeek = businessDate.getUTCDay();
  const schedule = days.find(d => d.dayOfWeek === dayOfWeek);
  if (!schedule || !schedule.isOpen) return false;

  return schedule.ranges.some(range => isWithinRange(date, businessDate, range));
}

// El campo Json de Prisma se lee como `unknown` en los hechos (tipado `JsonValue`) — acá se
// confía en que el contenido respeta `TimeRange[]` porque es el único código que escribe esta
// columna (vía updateBusinessHours, que ya validó con assertValidDays antes de guardar).
function parseRanges(value: Prisma.JsonValue): TimeRange[] {
  return value as unknown as TimeRange[];
}

async function readDays(): Promise<DaySchedule[]> {
  const rows = await db.businessHours.findMany({ orderBy: { dayOfWeek: "asc" } });
  return rows.map(r => ({ dayOfWeek: r.dayOfWeek, isOpen: r.isOpen, ranges: parseRanges(r.ranges) }));
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
    days.map(d => {
      const ranges = d.ranges as unknown as Prisma.InputJsonValue;
      return db.businessHours.upsert({
        where: { dayOfWeek: d.dayOfWeek },
        create: { dayOfWeek: d.dayOfWeek, isOpen: d.isOpen, ranges },
        update: { isOpen: d.isOpen, ranges },
      });
    })
  );
  return getBusinessHours();
}

// Usada por orders/service.ts para bloquear el checkout online fuera de horario.
export async function isBusinessOpenNow(): Promise<boolean> {
  const days = await readDays();
  return isOpenAt(new Date(), days);
}
