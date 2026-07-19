// Horario de un día de la semana (0=domingo..6=sábado, ver BusinessHours en schema.prisma).
// openTime/closeTime en formato "HH:mm"; si closeTime <= openTime, el cierre cruza la
// medianoche (ver isOpenAt en service.ts).
export type DaySchedule = {
  dayOfWeek: number;
  isOpen: boolean;
  openTime: string;
  closeTime: string;
};

// Horario completo de la semana + si el local está abierto en este instante, ya calculado
// del lado del servidor para que el cliente no tenga que reimplementar la lógica de husos
// horarios (ver isOpenAt).
export type BusinessHoursDTO = {
  days: DaySchedule[];
  isOpenNow: boolean;
};
