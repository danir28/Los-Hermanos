import cors from "cors";
import express from "express";
import { config } from "./config.js";
import { fudoRouter } from "./integrations/fudo/routes.js";
import { whatsappRouter } from "./integrations/whatsapp/routes.js";

const app = express();

app.use(cors({ origin: config.corsOrigin }));
app.use(express.json());

app.get("/api/health", (_req, res) => res.json({ ok: true }));
app.use("/api/fudo", fudoRouter);
app.use("/api/whatsapp", whatsappRouter);

app.listen(config.port, () => {
  console.log(`Servidor escuchando en http://localhost:${config.port}`);
});
