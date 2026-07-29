import { db } from "../db.js";
import type { UserRole } from "../auth/types.js";
import { PushSubscriptionExpiredError, sendPushNotification } from "./client.js";
import type { PushNotificationPayload, PushSubscriptionPayload } from "./types.js";

// Guarda (o actualiza) la suscripción push de un usuario. Upsert por endpoint —único por
// dispositivo/navegador— porque volver a suscribirse desde el mismo dispositivo (ej. se le
// vuelve a otorgar el permiso) debe reemplazar las keys viejas, no duplicar la fila; y si una
// tablet compartida pasa a otro usuario logueado, el mismo endpoint reasigna el dueño.
export async function saveSubscription(userId: string, subscription: PushSubscriptionPayload): Promise<void> {
  await db.pushSubscription.upsert({
    where: { endpoint: subscription.endpoint },
    update: { userId, p256dh: subscription.keys.p256dh, auth: subscription.keys.auth },
    create: { userId, endpoint: subscription.endpoint, p256dh: subscription.keys.p256dh, auth: subscription.keys.auth },
  });
}

// Borra una suscripción por endpoint. deleteMany (no delete): que ya no exista no es un error
// para quien llama (ej. el usuario tocó "desactivar" dos veces desde pestañas distintas).
export async function deleteSubscription(endpoint: string): Promise<void> {
  await db.pushSubscription.deleteMany({ where: { endpoint } });
}

// Manda una notificación a todas las suscripciones activas de un rol de staff. Nunca tira: un
// error de envío (o de VAPID sin configurar) se loguea y se salta esa suscripción puntual, para
// que un fallo de notificación jamás rompa el flujo que la disparó (ver notifyKitchenNewOrder,
// llamado desde orders/routes.ts justo después de crear el pedido). Una suscripción vencida
// (404/410 del proveedor) se borra sola, así el próximo intento no la vuelve a usar.
export async function notifyRole(role: UserRole, payload: PushNotificationPayload): Promise<void> {
  const subscriptions = await db.pushSubscription.findMany({ where: { user: { rol: role } } });
  await Promise.all(
    subscriptions.map(async sub => {
      try {
        await sendPushNotification({ endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } }, payload);
      } catch (err) {
        if (err instanceof PushSubscriptionExpiredError) {
          await deleteSubscription(sub.endpoint);
          return;
        }
        console.error("No se pudo enviar la notificación push:", err);
      }
    })
  );
}

// Arma y envía el aviso de "pedido nuevo" a todo el rol cocina.
export async function notifyKitchenNewOrder(order: { orderNumber: string; estimatedTime: string | null }): Promise<void> {
  await notifyRole("cocina", {
    title: "Nuevo pedido",
    body: order.estimatedTime ? `Pedido #${order.orderNumber} — retiro ${order.estimatedTime}` : `Pedido #${order.orderNumber}`,
    data: { orderNumber: order.orderNumber },
  });
}
