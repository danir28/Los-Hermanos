// Filtra cualquier carácter que no sea dígito de un valor de teléfono recién tipeado/pegado —
// usado en el onChange de los tres formularios que piden un teléfono (CustomerCart del cliente,
// ReceptionistCreateOrder que reusan recepción y cocina): el campo nunca llega a contener letras,
// espacios ni guiones, sin importar qué tipee o pegue quien lo carga. Coincide con el criterio que
// ya usa el backend para buscar por teléfono (ver lookupOrder en server/src/orders/service.ts,
// que normaliza de la misma forma al comparar).
export function onlyDigits(value: string): string {
  return value.replace(/\D/g, "");
}
