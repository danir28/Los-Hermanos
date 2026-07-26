// Una franja horaria dentro de un día, en formato "HH:mm". Si closeTime <= openTime, la
// franja cruza la medianoche (ver isOpenAt en service.ts).
export type TimeRange = {
  openTime: string;
  closeTime: string;
};

// Horario de un día de la semana (0=domingo..6=sábado, ver BusinessHours en schema.prisma).
// `ranges` soporta horario partido (ej. abre 11-15 y vuelve a abrir 19-23 el mismo día); un
// día abierto tiene al menos una franja, uno cerrado tiene `ranges: []`.
export type DaySchedule = {
  dayOfWeek: number;
  isOpen: boolean;
  ranges: TimeRange[];
};

// Horario completo de la semana + si el local está abierto en este instante, ya calculado
// del lado del servidor para que el cliente no tenga que reimplementar la lógica de husos
// horarios (ver isOpenAt).
export type BusinessHoursDTO = {
  days: DaySchedule[];
  isOpenNow: boolean;
};
