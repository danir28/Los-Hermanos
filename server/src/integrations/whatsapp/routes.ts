import { Router } from "express";
import { db } from "../../db.js";
import { config, isWhatsappConfigured } from "../../config.js";
import { sendWhatsappMessage, WhatsappNotConfiguredError } from "./client.js";
import type { WhatsappInboundEvent } from "./types.js";
import type { Prisma } from "../../generated/prisma/client.js";

export const whatsappRouter = Router();

whatsappRouter.get("/status", (_req, res) => {
  res.json({ configured: isWhatsappConfigured() });
});

// El agente llama a este endpoint cuando llega un mensaje/pedido por WhatsApp.
// Se persiste tal cual llega, sin procesar todavía (ver Riesgo 7 del documento
// de alcance: evita perder pedidos si falla la comunicación con el agente).
// TODO: conectar esto con la creación real de pedidos una vez definido el
// contrato con el desarrollador del agente.
whatsappRouter.post("/webhook", async (req, res) => {
  if (config.whatsapp.webhookSecret) {
    const provided = req.header("x-webhook-secret");
    if (provided !== config.whatsapp.webhookSecret) {
      res.status(401).json({ error: "Firma de webhook inválida" });
      return;
    }
  }

  const event = req.body as WhatsappInboundEvent;
  await db.whatsappInboundEvent.create({
    data: { type: event.type, from: event.from, payload: (event.payload ?? {}) as Prisma.InputJsonValue },
  });
  res.status(200).json({ received: true });
});

whatsappRouter.post("/notify", async (req, res) => {
  const { to, message } = req.body as { to?: string; message?: string };
  if (!to || !message) {
    res.status(400).json({ error: 'Faltan los campos "to" y "message"' });
    return;
  }
  try {
    await sendWhatsappMessage({ to, message });
    await db.whatsappOutboundMessage.create({ data: { to, message, success: true } });
    res.json({ sent: true });
  } catch (err) {
    const errorMessage =
      err instanceof WhatsappNotConfiguredError
        ? err.message
        : err instanceof Error
          ? err.message
          : "Error desconocido al enviar el mensaje";
    await db.whatsappOutboundMessage.create({ data: { to, message, success: false, error: errorMessage } });

    if (err instanceof WhatsappNotConfiguredError) {
      res.status(400).json({ error: errorMessage });
      return;
    }
    res.status(502).json({ error: errorMessage });
  }
});
