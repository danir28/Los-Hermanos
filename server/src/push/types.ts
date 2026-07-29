// Forma de una suscripción Web Push tal como la devuelve PushManager.subscribe() en el
// navegador (PushSubscriptionJSON) — el frontend manda esto tal cual a POST /api/push/subscribe.
export type PushSubscriptionPayload = {
  endpoint: string;
  keys: { p256dh: string; auth: string };
};

// Contenido de una notificación push. `data` viaja junto al payload para que el Service Worker
// (ver public-staff/sw-push.js) pueda usarlo al reaccionar a un click sobre la notificación.
export type PushNotificationPayload = {
  title: string;
  body: string;
  data?: Record<string, unknown>;
};
