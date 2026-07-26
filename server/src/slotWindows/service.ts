import { getBusinessHours } from "../businessHours/service.js";
import type { DaySchedule as BusinessDaySchedule } from "../businessHours/types.js";
import { db } from "../db.js";
import type { Prisma } from "../generated/prisma/client.js";
import type { SlotTimeRange, SlotWindowDay, SlotWindowsDTO } from "./types.js";

export class InvalidSlotWindowError extends Error {
  constructor(reason: string) {
    super(`Ventana de retiro inválida: ${reason}`);
    this.name = "InvalidSlotWindowError";
  }
}

// Falta la fila del día pedido en slot_windows — no debería pasar nunca en producción (la
// migración siembra los 7 días y PUT siempre reemplaza la semana completa), pero es la señal
// correcta si algún día la tabla queda incompleta a mano.
export class SlotWindowNotConfiguredError extends Error {
  constructor(dayOfWeek: number) {
    super(`No hay ventana de retiro configurada para el día ${dayOfWeek}`);
    this.name = "SlotWindowNotConfiguredError";
  }
}

const TIME_FORMAT = /^([01]\d|2[0-3]):[0-5]\d$/;

function toMinutes(time: string): number {
  const [hours, minutes] = time.split(":").map(Number);
  return hours * 60 + minutes;
}

// Fin de una franja de negocio en la línea de tiempo continua — si cruza la medianoche
// (closeTime <= openTime, ej. 19:00 a 02:00) se le suman 24hs. Mismo criterio que
// rangeEndMinutes en businessHours/service.ts; se duplica acá (no isSlotWithinBusinessHours) en
// vez de importarla porque esa función es privada de ese módulo y esto es solo 3 líneas.
function businessRangeEndMinutes(range: { openTime: string; closeTime: string }): number {
  const open = toMinutes(range.openTime);
  const close = toMinutes(range.closeTime);
  return close <= open ? close + 24 * 60 : close;
}

// true si la franja de retiro cae COMPLETAMENTE dentro de alguna franja de atención del local
// ese mismo día — no alcanza con que se solapen parcialmente. Las franjas de retiro nunca cruzan
// la medianoche (se valida aparte, más abajo), así que alcanza comparar el minuto de cierre
// "extendido" de cada franja de negocio (que si puede cruzarla).
function isWithinBusinessHours(slotRange: SlotTimeRange, businessDay: BusinessDaySchedule | undefined): boolean {
  if (!businessDay || !businessDay.isOpen) return false;
  const slotStart = toMinutes(slotRange.startTime);
  const slotEnd = toMinutes(slotRange.endTime);
  return businessDay.ranges.some(br => slotStart >= toMinutes(br.openTime) && slotEnd <= businessRangeEndMinutes(br));
}

// Rechaza franjas de retiro que se superponen o se tocan en el límite exacto — mismo criterio
// que assertNoOverlaps en businessHours/service.ts (se duplica por la misma razón: no se
// comparte código entre módulos para una regla de unas pocas líneas).
function assertNoOverlaps(dayOfWeek: number, ranges: SlotTimeRange[]): void {
  const sorted = [...ranges].sort((a, b) => toMinutes(a.startTime) - toMinutes(b.startTime));
  for (let i = 1; i < sorted.length; i++) {
    if (toMinutes(sorted[i].startTime) <= toMinutes(sorted[i - 1].endTime)) {
      throw new InvalidSlotWindowError(`las franjas de retiro del día ${dayOfWeek} se superponen o se tocan entre sí`);
    }
  }
}

// Valida que vengan exactamente los 7 días de la semana (0-6), sin repetidos, cada franja en
// formato "HH:mm" con startTime anterior a endTime, sin superponerse con otra franja del mismo
// día, y — la regla nueva — completamente contenida dentro del horario de atención del local ese
// día (`businessDays`, ver businessHours/service.ts#getBusinessHours). Recibe `businessDays`
// como parámetro en vez de consultarlo ella misma para seguir siendo testeable sin DB; quien la
// llama (updateSlotWindows) es responsable de traerlo antes.
export function assertValidSlotWindowDays(days: SlotWindowDay[], businessDays: BusinessDaySchedule[]): void {
  if (days.length !== 7) throw new InvalidSlotWindowError("hacen falta los 7 días de la semana");
  const businessByDay = new Map(businessDays.map(d => [d.dayOfWeek, d]));
  const seen = new Set<number>();
  for (const day of days) {
    if (!Number.isInteger(day.dayOfWeek) || day.dayOfWeek < 0 || day.dayOfWeek > 6) {
      throw new InvalidSlotWindowError(`"dayOfWeek" inválido: ${day.dayOfWeek}`);
    }
    if (seen.has(day.dayOfWeek)) throw new InvalidSlotWindowError(`día ${day.dayOfWeek} repetido`);
    seen.add(day.dayOfWeek);
    if (!Array.isArray(day.ranges)) {
      throw new InvalidSlotWindowError(`"ranges" debe ser un array (día ${day.dayOfWeek})`);
    }

    for (const range of day.ranges) {
      if (!TIME_FORMAT.test(range.startTime) || !TIME_FORMAT.test(range.endTime)) {
        throw new InvalidSlotWindowError(`"startTime"/"endTime" deben tener formato "HH:mm" (día ${day.dayOfWeek})`);
      }
      if (toMinutes(range.startTime) >= toMinutes(range.endTime)) {
        throw new InvalidSlotWindowError(`"startTime" tiene que ser anterior a "endTime" (día ${day.dayOfWeek})`);
      }
      if (!isWithinBusinessHours(range, businessByDay.get(day.dayOfWeek))) {
        throw new InvalidSlotWindowError(
          `la franja ${range.startTime} a ${range.endTime} del día ${day.dayOfWeek} no está dentro del horario de atención del local ese día`
        );
      }
    }
    assertNoOverlaps(day.dayOfWeek, day.ranges);
  }
}

// El campo Json de Prisma se lee como `unknown` en los hechos (tipado `JsonValue`) — acá se
// confía en que el contenido respeta `SlotTimeRange[]` porque es el único código que escribe
// esta columna (vía updateSlotWindows, que ya validó con assertValidSlotWindowDays antes de
// guardar). Mismo patrón que parseRanges en businessHours/service.ts.
function parseRanges(value: Prisma.JsonValue): SlotTimeRange[] {
  return value as unknown as SlotTimeRange[];
}

async function readDays(): Promise<SlotWindowDay[]> {
  const rows = await db.slotWindow.findMany({ orderBy: { dayOfWeek: "asc" } });
  return rows.map(r => ({ dayOfWeek: r.dayOfWeek, ranges: parseRanges(r.ranges) }));
}

// Trae la ventana de retiro de los 7 días. La consume la pantalla de cocina para mostrar y
// editar la grilla completa de una vez (PUT siempre reemplaza la semana entera).
export async function getSlotWindows(): Promise<SlotWindowsDTO> {
  return { days: await readDays() };
}

export async function updateSlotWindows(days: SlotWindowDay[]): Promise<SlotWindowsDTO> {
  const { days: businessDays } = await getBusinessHours();
  assertValidSlotWindowDays(days, businessDays);
  await db.$transaction(
    days.map(d => {
      const ranges = d.ranges as unknown as Prisma.InputJsonValue;
      return db.slotWindow.upsert({
        where: { dayOfWeek: d.dayOfWeek },
        create: { dayOfWeek: d.dayOfWeek, ranges },
        update: { ranges },
      });
    })
  );
  return getSlotWindows();
}

// Franjas de retiro del día de la jornada comercial dada — la usa orders/service.ts
// (createOrder, updateOrder, getSlotAvailability) para armar la grilla de turnos de ESE día
// puntual. No vuelve a validar contra BusinessHours acá (eso ya se garantizó al guardar, ver
// assertValidSlotWindowDays) — si el horario de atención cambia DESPUÉS de guardada esta
// ventana, la franja guardada puede quedar temporalmente desalineada hasta que cocina la
// vuelva a guardar; no se resuelve solo (ver aviso en la conversación de la sesión que agregó
// esta validación).
export async function getSlotWindowFor(businessDate: Date): Promise<SlotTimeRange[]> {
  const dayOfWeek = businessDate.getUTCDay();
  const row = await db.slotWindow.findUnique({ where: { dayOfWeek } });
  if (!row) throw new SlotWindowNotConfiguredError(dayOfWeek);
  return parseRanges(row.ranges);
}
