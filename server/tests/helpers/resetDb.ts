import { db } from "../../src/db.js";

// Limpia el estado de pedidos entre tests de integración de orders/service.ts. Trunca solo
// Order (OrderItem cae en cascada, ver schema.prisma) y OrderCounter — no toca User a
// propósito, cada archivo de test maneja sus propios usuarios con más precisión (por prefijo
// de "usuario" o por id puntual) para no pisar fixtures de otros archivos.
export async function resetDb() {
  await db.order.deleteMany({});
  await db.orderCounter.deleteMany({});
}
