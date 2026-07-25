import { argentinaWallTimeToUtc } from "./businessDay.js";

// Se llegó a esto en la reunión del 23/7/2026 con el cliente: antes, cocina le asignaba el
// horario de retiro al cliente DESPUÉS de creado el pedido (ver KitchenAssign, ahora
// "Reprogramar") y a veces ese horario no le servía. La solución fue que el horario se elija
// al momento de crear el pedido, de una grilla de turnos con cupo limitado, para que nunca se
// prometa un horario que cocina no puede cumplir.
//
// El rango va hardcodeado acá (no derivado de BusinessHours) a propósito: BusinessHours es el
// horario de ATENCIÓN del local (cruza medianoche, ~19:00 a 02:00), mientras que esta es la
// ventana de RETIRO PROGRAMABLE, más angosta y con otro propósito. Si el cliente pide en el
// futuro que este rango sea editable, es la misma extensión que ya tiene BusinessHours (tabla +
// pantalla admin) — no se hace ahora porque no fue pedido.
export const SLOT_STEP_MINUTES = 5;
export const SLOT_RANGE_START = "19:00";
export const SLOT_RANGE_END = "22:55"; // último turno reservable: garantiza que el retiro más tardío sea a las 23:00
export const SLOT_CAPACITY = 4;
// Margen mínimo entre "ahora" y el turno elegible, para darle tiempo a cocina de prepararlo
// (pedido del 24/7/2026: a las 19:00, el primer turno elegible tiene que ser 19:20, no 19:00 ni
// 19:05 — y cerca del cierre, un turno a solo 19 minutos, como 22:55 siendo las 22:36, tampoco
// debería poder elegirse). Un turno ya pasado queda cubierto por la misma regla sin caso
// aparte: "pasado" es sólo el caso extremo de "no da el margen".
export const MIN_LEAD_MINUTES = 20;

const TIME_FORMAT = /^([01]\d|2[0-3]):[0-5]\d$/; // mismo regex que businessHours/service.ts

export class SlotFullError extends Error {
  constructor(slot: string) {
    super(`El horario ${slot} ya no tiene cupos disponibles`);
    this.name = "SlotFullError";
  }
}

export class InvalidSlotError extends Error {
  constructor(reason: string) {
    super(`Horario de retiro inválido: ${reason}`);
    this.name = "InvalidSlotError";
  }
}

// Exportada porque orders/service.ts#advanceScheduledOrders también necesita convertir un
// estimatedTime ("HH:mm") a instante real, para decidir si ya toca avanzar el estado.
export function parseTime(time: string): { hours: number; minutes: number } {
  const [hours, minutes] = time.split(":").map(Number);
  return { hours, minutes };
}

function toMinutesSinceMidnight(time: string): number {
  const { hours, minutes } = parseTime(time);
  return hours * 60 + minutes;
}

export function isSlotFormatValid(slot: string): boolean {
  return TIME_FORMAT.test(slot);
}

// Dentro de [SLOT_RANGE_START, SLOT_RANGE_END] y alineado al paso de 5 minutos — no alcanza con
// estar en rango, "19:03" no es un turno válido aunque esté entre las dos puntas.
export function isSlotInRange(slot: string): boolean {
  if (!isSlotFormatValid(slot)) return false;
  const value = toMinutesSinceMidnight(slot);
  const start = toMinutesSinceMidnight(SLOT_RANGE_START);
  const end = toMinutesSinceMidnight(SLOT_RANGE_END);
  return value >= start && value <= end && (value - start) % SLOT_STEP_MINUTES === 0;
}

// Lista completa de turnos válidos del rango, ej. ["19:00", "19:05", ..., "22:55"].
export function generateSlots(): string[] {
  const start = toMinutesSinceMidnight(SLOT_RANGE_START);
  const end = toMinutesSinceMidnight(SLOT_RANGE_END);
  const slots: string[] = [];
  for (let m = start; m <= end; m += SLOT_STEP_MINUTES) {
    const hours = Math.floor(m / 60);
    const minutes = m % 60;
    slots.push(`${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}`);
  }
  return slots;
}

// Compara el turno (hora de pared en Argentina, dentro de la jornada comercial dada) contra el
// instante real más el margen de preparación — reusa argentinaWallTimeToUtc (businessDay.ts),
// mismo patrón que isOpenAt en businessHours/service.ts, para no reimplementar el manejo del
// offset fijo en un tercer lugar. Un turno ya estrictamente pasado también da true acá: "pasado"
// es el caso límite de "falta menos de MIN_LEAD_MINUTES", no hace falta chequearlo aparte.
export function isSlotTooSoon(slot: string, businessDate: Date, now: Date = new Date()): boolean {
  const { hours, minutes } = parseTime(slot);
  const slotUtc = argentinaWallTimeToUtc(businessDate, hours, minutes);
  const threshold = now.getTime() + MIN_LEAD_MINUTES * 60_000;
  return slotUtc.getTime() < threshold;
}

// Valida formato + rango + que dé el margen de preparación; tira InvalidSlotError con el motivo
// puntual. Usada por createOrder/updateOrder antes de chequear cupo — no tiene sentido contar
// ocupación de un turno que ni siquiera es válido.
export function assertValidSlotOrThrow(slot: string, businessDate: Date, now: Date = new Date()): void {
  if (!isSlotFormatValid(slot)) throw new InvalidSlotError('debe tener formato "HH:mm"');
  if (!isSlotInRange(slot)) throw new InvalidSlotError(`debe estar entre ${SLOT_RANGE_START} y ${SLOT_RANGE_END}, en pasos de ${SLOT_STEP_MINUTES} minutos`);
  if (isSlotTooSoon(slot, businessDate, now)) throw new InvalidSlotError(`no da tiempo a prepararlo — hace falta elegir un horario con al menos ${MIN_LEAD_MINUTES} minutos de anticipación`);
}
