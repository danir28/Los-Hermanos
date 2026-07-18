// El local abre hasta pasada la medianoche (~2am) y el número de pedido se reinicia a las
// 7:00 — por eso la "jornada comercial" no coincide con el día calendario: un pedido hecho a
// la 1am todavía pertenece a la jornada del día anterior, no a la de "hoy". Se calcula en hora
// de Argentina (UTC-3 fijo, sin horario de verano) de forma explícita, sin depender de en qué
// huso horario esté configurado el sistema operativo del servidor — relevante para cuando esto
// corra en un VPS que podría no estar en horario argentino.
const ARGENTINA_OFFSET_MS = -3 * 60 * 60 * 1000;
const BUSINESS_DAY_START_HOUR = 7;

// Devuelve la fecha (medianoche) de la jornada comercial a la que pertenece un instante dado.
// Ej: un pedido creado a las 23:50 del día 18 pertenece a la jornada "18"; uno creado a la
// 1:30 del día 19 pertenece TODAVÍA a la jornada "18" (no arrancó la jornada "19" hasta las 7am).
export function businessDayFor(date: Date): Date {
  const shifted = new Date(date.getTime() + ARGENTINA_OFFSET_MS);
  if (shifted.getUTCHours() < BUSINESS_DAY_START_HOUR) {
    shifted.setUTCDate(shifted.getUTCDate() - 1);
  }
  shifted.setUTCHours(0, 0, 0, 0);
  return shifted;
}
