import { Router } from "express";
import { requireAuth, requireRole } from "../auth/middleware.js";
import { asyncHandler } from "../lib/asyncHandler.js";
import { deleteSubscription, saveSubscription } from "./service.js";
import type { PushSubscriptionPayload } from "./types.js";

export const pushRouter = Router();

// Guarda la suscripción push del dispositivo que la llama. Solo-cocina: es el único rol que hoy
// necesita el aviso de "pedido nuevo" (ver push/service.ts#notifyKitchenNewOrder).
pushRouter.post("/subscribe", requireAuth, requireRole("cocina"), asyncHandler(async (req, res) => {
  const subscription = req.body as Partial<PushSubscriptionPayload>;
  if (!subscription.endpoint || !subscription.keys?.p256dh || !subscription.keys?.auth) {
    res.status(400).json({ error: 'Faltan datos de la suscripción ("endpoint", "keys.p256dh", "keys.auth")' });
    return;
  }
  await saveSubscription(req.user!.id, subscription as PushSubscriptionPayload);
  res.status(201).json({ ok: true });
}));

// Da de baja una suscripción puntual (ej. el usuario desactiva las notificaciones desde la UI).
pushRouter.post("/unsubscribe", requireAuth, requireRole("cocina"), asyncHandler(async (req, res) => {
  const { endpoint } = req.body as { endpoint?: string };
  if (!endpoint) {
    res.status(400).json({ error: 'Falta el campo "endpoint"' });
    return;
  }
  await deleteSubscription(endpoint);
  res.json({ ok: true });
}));
