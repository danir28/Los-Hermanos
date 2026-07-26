// Una franja de retiro en formato "HH:mm". A diferencia de las franjas de BusinessHours, nunca
// cruza la medianoche: startTime siempre es anterior a endTime (se valida en service.ts).
export type SlotTimeRange = { startTime: string; endTime: string };

// Ventana de retiro de un día de la semana (0=domingo..6=sábado, ver SlotWindow en
// schema.prisma) — no confundir con DaySchedule de businessHours (horario de ATENCIÓN del
// local). `ranges` soporta franjas múltiples (ej. una franja de mediodía y otra de noche,
// calcadas de un horario partido del local); un día sin franjas configuradas simplemente no
// ofrece turnos de retiro ese día.
export type SlotWindowDay = {
  dayOfWeek: number;
  ranges: SlotTimeRange[];
};

export type SlotWindowsDTO = {
  days: SlotWindowDay[];
};
