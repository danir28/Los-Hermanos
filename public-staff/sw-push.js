// Service Worker de la app de staff, dedicado exclusivamente a notificaciones Web Push (el aviso
// de "pedido nuevo" a cocina — ver src/app/lib/push.ts y server/src/push/). JS plano, sin pasar
// por Vite/TS: los Service Workers corren en su propio contexto (sin DOM), no en el bundle de la
// app. No cachea nada de la app (no es un Service Worker "offline-first") — solo escucha push.

// Llega un push del backend (ver notifyKitchenNewOrder en server/src/push/service.ts). El payload
// es el mismo JSON que arma ese módulo: { title, body, data }.
self.addEventListener("push", event => {
  let payload = { title: "Nuevo pedido", body: "" };
  try {
    if (event.data) payload = event.data.json();
  } catch {
    // Si el payload no es JSON válido, se muestra igual con el título/body por default de arriba
    // en vez de dejar que el evento falle silenciosamente y no se vea ninguna notificación.
  }

  event.waitUntil(
    Promise.all([
      self.registration.showNotification(payload.title || "Nuevo pedido", {
        body: payload.body || "",
        data: payload.data || {},
        // tag agrupa notificaciones sucesivas de pedidos en una sola (Android las apila si no):
        // acá se deja que cada pedido tenga su propia notificación, así que no se fija tag.
      }),
      // Avisa también a cualquier pestaña abierta de la app (no solo al banner del sistema): el
      // beep sonoro de "pedido nuevo" (ver src/app/lib/sound.ts) se dispara desde acá porque
      // ninguna notificación del sistema operativo puede llevar un sonido propio — showNotification
      // no tiene (ni tuvo nunca soportado, en ningún navegador) un campo de audio. Si la pestaña
      // está en primer plano, este mensaje llega casi al instante; si no hay ninguna abierta, esto
      // no hace nada (matchAll devuelve una lista vacía) y el aviso queda solo en el banner del SO.
      self.clients.matchAll({ type: "window", includeUncontrolled: true }).then(clientList => {
        clientList.forEach(client => client.postMessage({ type: "nuevo-pedido-push", data: payload.data || {} }));
      }),
    ])
  );
});

// Al tocar la notificación: si ya hay una pestaña de la app abierta, la enfoca en vez de abrir
// una nueva (evita acumular pestañas duplicadas en la tablet de cocina).
self.addEventListener("notificationclick", event => {
  event.notification.close();
  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then(clientList => {
      for (const client of clientList) {
        if ("focus" in client) return client.focus();
      }
      if (self.clients.openWindow) return self.clients.openWindow("/");
    })
  );
});
