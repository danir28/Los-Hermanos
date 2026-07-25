import cors from "cors";
import express from "express";
import type { NextFunction, Request, Response } from "express";
import { authRouter } from "./auth/routes.js";
import { businessHoursRouter } from "./businessHours/routes.js";
import { config } from "./config.js";
import { db } from "./db.js";
import { fudoRouter } from "./integrations/fudo/routes.js";
import { whatsappRouter } from "./integrations/whatsapp/routes.js";
import { ordersRouter } from "./orders/routes.js";
import { advanceScheduledOrders } from "./orders/service.js";
import { productsRouter } from "./products/routes.js";
import { reportsRouter } from "./reports/routes.js";

const app = express();

app.use(cors({ origin: config.corsOrigin }));
app.use(express.json());

// Chequeo de salud del backend, público y sin dependencias (no toca la DB): solo confirma
// que el proceso está arriba y respondiendo.
app.get("/api/health", (_req, res) => res.json({ ok: true }));
app.use("/api/auth", authRouter);
app.use("/api/business-hours", businessHoursRouter);
app.use("/api/fudo", fudoRouter);
app.use("/api/whatsapp", whatsappRouter);
app.use("/api/orders", ordersRouter);
app.use("/api/products", productsRouter);
app.use("/api/reports", reportsRouter);

// Middleware de error global: atrapa lo que asyncHandler reenvía con next(err) para que
// un error de un handler async devuelva 500 en vez de dejar el request colgado.
app.use((err: unknown, _req: Request, res: Response, _next: NextFunction) => {
  console.error(err);
  res.status(500).json({ error: err instanceof Error ? err.message : "Error interno del servidor" });
});

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
