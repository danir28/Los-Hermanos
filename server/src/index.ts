import { app } from "./app.js";
import { config } from "./config.js";
import { db } from "./db.js";
import { advanceScheduledOrders } from "./orders/service.js";

const server = app.listen(config.port, () => {
  console.log(`Servidor escuchando en http://localhost:${config.port}`);
});

// Avance automático de estados por horario (ver orders/service.ts#advanceScheduledOrders):
// corre cada 60s mientras el proceso esté arriba, no necesita infraestructura de cron aparte.
// El try/catch es necesario porque el callback de setInterval no puede ser async de forma
// segura — una promesa rechazada ahí se pierde como "unhandled rejection" en vez de loguearse.
const advanceInterval = setInterval(() => {
  advanceScheduledOrders().catch(err => console.error("Error en el avance automático de pedidos:", err));
}, 60_000);
advanceScheduledOrders().catch(err => console.error("Error en el avance automático de pedidos:", err));

// Apagado prolijo: al recibir SIGINT/SIGTERM (Ctrl+C, o el que mande el proceso que
// administre el deploy) deja de aceptar conexiones nuevas, y solo desconecta Prisma
// (y recién ahí sale) una vez que el servidor terminó de cerrar, para no cortar
// conexiones a la DB que todavía estén en uso por un request en curso.
for (const signal of ["SIGINT", "SIGTERM"] as const) {
  process.on(signal, () => {
    clearInterval(advanceInterval);
    server.close(() => {
      db.$disconnect().finally(() => process.exit(0));
    });
  });
}
