import cors from "cors";
import express from "express";
import { config } from "./config.js";
import { db } from "./db.js";
import { fudoRouter } from "./integrations/fudo/routes.js";
import { whatsappRouter } from "./integrations/whatsapp/routes.js";
import { ordersRouter } from "./orders/routes.js";
import { reportsRouter } from "./reports/routes.js";

const app = express();

app.use(cors({ origin: config.corsOrigin }));
app.use(express.json());

app.get("/api/health", (_req, res) => res.json({ ok: true }));
app.use("/api/fudo", fudoRouter);
app.use("/api/whatsapp", whatsappRouter);
app.use("/api/orders", ordersRouter);
app.use("/api/reports", reportsRouter);

const server = app.listen(config.port, () => {
  console.log(`Servidor escuchando en http://localhost:${config.port}`);
});

for (const signal of ["SIGINT", "SIGTERM"] as const) {
  process.on(signal, () => {
    server.close(() => {
      db.$disconnect().finally(() => process.exit(0));
    });
  });
}
