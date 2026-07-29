import webpush from "web-push";
import { config, isPushConfigured } from "../config.js";
import type { PushNotificationPayload, PushSubscriptionPayload } from "./types.js";

export class PushNotConfiguredError extends Error {
  constructor() {
    super("Las notificaciones push no están configuradas. Completá VAPID_PUBLIC_KEY/VAPID_PRIVATE_KEY en server/.env");
    this.name = "PushNotConfiguredError";
  }
}

// El proveedor (FCM/etc., detrás del endpoint de la suscripción) confirmó que esta suscripción ya
// no existe (404/410) — quien llama a sendPushNotification debe borrar esa fila, no reintentar.
export class PushSubscriptionExpiredError extends Error {
  constructor() {
    super("La suscripción push ya no es válida");
    this.name = "PushSubscriptionExpiredError";
  }
}

// setVapidDetails solo hace falta llamarlo una vez por proceso, no en cada envío.
let vapidConfigured = false;

function ensureVapidConfigured() {
  if (!isPushConfigured()) throw new PushNotConfiguredError();
  if (!vapidConfigured) {
    webpush.setVapidDetails(config.push.vapidSubject, config.push.vapidPublicKey, config.push.vapidPrivateKey);
    vapidConfigured = true;
  }
}

// Envía una notificación push a una única suscripción. Tira PushSubscriptionExpiredError si el
// proveedor confirma que la suscripción ya no existe — cualquier otro error (de red, de
// configuración) se propaga tal cual para que push/service.ts decida qué hacer con él.
export async function sendPushNotification(
  subscription: PushSubscriptionPayload,
  payload: PushNotificationPayload
): Promise<void> {
  ensureVapidConfigured();
  try {
    await webpush.sendNotification(subscription as webpush.PushSubscription, JSON.stringify(payload));
  } catch (err) {
    const statusCode = (err as { statusCode?: number }).statusCode;
    if (statusCode === 404 || statusCode === 410) {
      throw new PushSubscriptionExpiredError();
    }
    throw err;
  }
}
