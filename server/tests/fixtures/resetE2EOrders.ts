import "dotenv/config";
import { db } from "../../src/db.js";

// Trunca Order (OrderItem cae en cascada) y OrderCounter en la base de test antes de cada
// corrida de Playwright (ver tests/e2e/global-setup.ts). Los specs de cliente/recepción crean
// pedidos reales y nunca los borran solos — sin este paso, se van acumulando turnos ocupados
// que, si coinciden en el tiempo con el test de concurrencia del backend
// (server/src/orders/service.test.ts), pueden hacer que ese test falle sin que haya ningún bug
// real (el turno ya estaba lleno de pedidos viejos, no de los que crea ese test).
async function main() {
  await db.order.deleteMany({});
  await db.orderCounter.deleteMany({});
  console.log("Pedidos de test previos limpiados.");
}

main()
  .catch(err => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(() => db.$disconnect());
