import cors from "cors";
import express from "express";
import type { NextFunction, Request, Response } from "express";
import { authRouter } from "./auth/routes.js";
import { businessHoursRouter } from "./businessHours/routes.js";
import { config } from "./config.js";
import { fudoRouter } from "./integrations/fudo/routes.js";
import { whatsappRouter } from "./integrations/whatsapp/routes.js";
import { ordersRouter } from "./orders/routes.js";
import { productsRouter } from "./products/routes.js";
import { reportsRouter } from "./reports/routes.js";
import { slotWindowsRouter } from "./slotWindows/routes.js";

// App de Express sin efectos secundarios (sin .listen(), sin setInterval, sin signal
// handlers) — separado de index.ts para poder importarlo en tests con supertest sin
// bindear un puerto real ni arrancar el barrido automático de pedidos. index.ts es el
// único que arranca el proceso real.
export const app = express();

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
app.use("/api/slot-windows", slotWindowsRouter);

// Middleware de error global: atrapa lo que asyncHandler reenvía con next(err) para que
// un error de un handler async devuelva 500 en vez de dejar el request colgado.
app.use((err: unknown, _req: Request, res: Response, _next: NextFunction) => {
  console.error(err);
  res.status(500).json({ error: err instanceof Error ? err.message : "Error interno del servidor" });
});
