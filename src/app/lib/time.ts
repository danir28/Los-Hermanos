// Utilidades centrales de formateo de hora — todo en 24hs. Existe porque antes de esto no había
// un solo lugar reutilizable: cada pantalla concatenaba "{hora} hs" a mano o llamaba
// toLocaleTimeString sin forzar hour12: false, con riesgo de mostrar AM/PM según el navegador
// (mismo bug que ya se había corregido puntualmente en server/src/orders/service.ts).

// Formatea un horario "HH:mm" ya conocido (ej. estimatedTime) para mostrarlo al usuario.
export function formatTimeLabel(time: string): string {
  return `${time} hs`;
}

// Hora actual en formato "HH:mm", siempre 24hs.
export function nowLabel(): string {
  return new Date().toLocaleTimeString("es-AR", { hour: "2-digit", minute: "2-digit", hour12: false });
}

// Fecha y hora actuales combinadas, para el encabezado del ticket de impresión.
export function nowDateTimeLabel(): string {
  const date = new Date();
  return `${date.toLocaleDateString("es-AR")} ${nowLabel()}`;
}
