import { Router } from "express";
import { config, isWhatsappConfigured } from "../../config.js";
import { sendWhatsappMessage, WhatsappNotConfiguredError } from "./client.js";
import type { WhatsappInboundEvent } from "./types.js";

export const whatsappRouter = Router();

whatsappRouter.get("/status", (_req, res) => {
  res.json({ configured: isWhatsappConfigured() });
});

// El agente llama a este endpoint cuando llega un mensaje/pedido por WhatsApp.
// TODO: conectar esto con la creación real de pedidos una vez definido el
// contrato con el desarrollador del agente.
whatsappRouter.post("/webhook", (req, res) => {
  if (config.whatsapp.webhookSecret) {
    const provided = req.header("x-webhook-secret");
    if (provided !== config.whatsapp.webhookSecret) {
      res.status(401).json({ error: "Firma de webhook inválida" });
      return;
    }
  }

  const event = req.body as WhatsappInboundEvent;
  console.log("[whatsapp] evento recibido del agente:", event);
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
    res.json({ sent: true });
  } catch (err) {
    if (err instanceof WhatsappNotConfiguredError) {
      res.status(400).json({ error: err.message });
      return;
    }
    res.status(502).json({ error: err instanceof Error ? err.message : "Error desconocido al enviar el mensaje" });
  }
});
