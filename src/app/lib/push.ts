import { api } from "./api";

// Convierte la clave pública VAPID (base64url, como la expone el backend) al Uint8Array que pide
// PushManager.subscribe() — la Push API no acepta el string directamente.
function urlBase64ToUint8Array(base64: string): Uint8Array {
  const padding = "=".repeat((4 - (base64.length % 4)) % 4);
  const base64Safe = (base64 + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(base64Safe);
  return Uint8Array.from([...raw].map(c => c.charCodeAt(0)));
}

// Todo lo que hace falta para poder suscribirse: soporte del navegador (Service Worker + Push
// API) y la clave pública VAPID cargada en el build (VITE_VAPID_PUBLIC_KEY).
export function isPushSupported(): boolean {
  return "serviceWorker" in navigator && "PushManager" in window && Boolean(import.meta.env.VITE_VAPID_PUBLIC_KEY);
}

// register() es seguro de llamar más de una vez con el mismo script: el navegador reutiliza la
// suscripción existente en vez de duplicarla, así que no hace falta chequear antes si ya existe.
function registerServiceWorker(): Promise<ServiceWorkerRegistration> {
  return navigator.serviceWorker.register("/sw-push.js");
}

// Suscripción activa del dispositivo, si ya existe — la usa NotificationSetup para saber si
// mostrar "Activar" o "Notificaciones activadas" al montarse.
export async function getExistingSubscription(): Promise<PushSubscription | null> {
  if (!isPushSupported()) return null;
  const registration = await registerServiceWorker();
  return registration.pushManager.getSubscription();
}

function toPayload(subscription: PushSubscription) {
  const json = subscription.toJSON();
  if (!json.endpoint || !json.keys?.p256dh || !json.keys?.auth) {
    throw new Error("La suscripción push no trajo los datos esperados");
  }
  return { endpoint: json.endpoint, keys: { p256dh: json.keys.p256dh, auth: json.keys.auth } };
}

// Pide permiso de notificaciones (dispara el diálogo del navegador si todavía no se respondió),
// se suscribe a Web Push y manda la suscripción al backend. Tira si el navegador no soporta push
// o si el usuario rechaza el permiso — el llamador (NotificationSetup) decide cómo mostrarlo.
export async function subscribeToKitchenPush(token: string): Promise<void> {
  if (!isPushSupported()) throw new Error("Este navegador no soporta notificaciones push");

  const permission = await Notification.requestPermission();
  if (permission !== "granted") throw new Error("No se otorgó el permiso de notificaciones");

  const registration = await registerServiceWorker();
  const existing = await registration.pushManager.getSubscription();
  const subscription =
    existing ??
    (await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(import.meta.env.VITE_VAPID_PUBLIC_KEY),
    }));

  await api.pushSubscribe(token, toPayload(subscription));
}

// Da de baja la suscripción activa del dispositivo, tanto del lado del navegador como del backend.
export async function unsubscribeFromKitchenPush(token: string): Promise<void> {
  const subscription = await getExistingSubscription();
  if (!subscription) return;
  const endpoint = subscription.endpoint;
  await subscription.unsubscribe();
  await api.pushUnsubscribe(token, endpoint);
}
