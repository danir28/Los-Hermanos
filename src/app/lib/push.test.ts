import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { api } from "./api";
import { getExistingSubscription, isPushSupported, subscribeToKitchenPush, unsubscribeFromKitchenPush } from "./push";

// jsdom no implementa Service Worker / Push API / Notification — se stubean acá a mano para
// simular el navegador. Se limpian en afterEach para no filtrar estado entre tests.
function fakeSubscription(endpoint = "https://push.example/device-1") {
  return {
    endpoint,
    toJSON: () => ({ endpoint, keys: { p256dh: "p256dh-value", auth: "auth-value" } }),
    unsubscribe: vi.fn().mockResolvedValue(true),
  } as unknown as PushSubscription;
}

function stubBrowserSupport(options: { existingSubscription?: PushSubscription | null; subscribeResult?: PushSubscription } = {}) {
  const pushManager = {
    getSubscription: vi.fn().mockResolvedValue(options.existingSubscription ?? null),
    subscribe: vi.fn().mockResolvedValue(options.subscribeResult ?? fakeSubscription()),
  };
  const register = vi.fn().mockResolvedValue({ pushManager });
  Object.defineProperty(navigator, "serviceWorker", { configurable: true, value: { register } });
  Object.defineProperty(window, "PushManager", { configurable: true, value: function PushManager() {} });
  return { pushManager, register };
}

function stubNotificationPermission(result: NotificationPermission) {
  Object.defineProperty(window, "Notification", {
    configurable: true,
    value: { requestPermission: vi.fn().mockResolvedValue(result) },
  });
}

beforeEach(() => {
  vi.stubEnv("VITE_VAPID_PUBLIC_KEY", "BBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBB");
});

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllEnvs();
  Reflect.deleteProperty(navigator, "serviceWorker");
  Reflect.deleteProperty(window, "PushManager");
  Reflect.deleteProperty(window, "Notification");
});

describe("isPushSupported", () => {
  it("es false sin serviceWorker/PushManager en el navegador", () => {
    expect(isPushSupported()).toBe(false);
  });

  it("es false si falta la clave pública VAPID del build", () => {
    stubBrowserSupport();
    // Se stubea explícitamente vacía en vez de solo hacer unstub: unstub vuelve al valor real
    // cargado desde el .env local (si existe uno con VITE_VAPID_PUBLIC_KEY seteada), lo que
    // haría este test dependiente de si esa variable está o no configurada en la máquina.
    vi.stubEnv("VITE_VAPID_PUBLIC_KEY", "");
    expect(isPushSupported()).toBe(false);
  });

  it("es true con soporte del navegador y la clave cargada", () => {
    stubBrowserSupport();
    expect(isPushSupported()).toBe(true);
  });
});

describe("getExistingSubscription", () => {
  it("devuelve null si el navegador no soporta push", async () => {
    expect(await getExistingSubscription()).toBeNull();
  });

  it("devuelve la suscripción activa del Service Worker", async () => {
    const existing = fakeSubscription();
    stubBrowserSupport({ existingSubscription: existing });
    expect(await getExistingSubscription()).toBe(existing);
  });
});

describe("subscribeToKitchenPush", () => {
  it("tira si el navegador no soporta push", async () => {
    await expect(subscribeToKitchenPush("token")).rejects.toThrow("no soporta notificaciones push");
  });

  it("tira si el usuario no otorga el permiso", async () => {
    stubBrowserSupport();
    stubNotificationPermission("denied");
    await expect(subscribeToKitchenPush("token")).rejects.toThrow("No se otorgó el permiso");
  });

  it("se suscribe y manda la suscripción al backend cuando no había una previa", async () => {
    const created = fakeSubscription("https://push.example/nueva");
    const { pushManager } = stubBrowserSupport({ subscribeResult: created });
    stubNotificationPermission("granted");
    const spy = vi.spyOn(api, "pushSubscribe").mockResolvedValue({ ok: true });

    await subscribeToKitchenPush("token-123");

    expect(pushManager.subscribe).toHaveBeenCalledOnce();
    expect(spy).toHaveBeenCalledWith("token-123", {
      endpoint: "https://push.example/nueva",
      keys: { p256dh: "p256dh-value", auth: "auth-value" },
    });
  });

  it("reutiliza la suscripción existente en vez de crear una nueva", async () => {
    const existing = fakeSubscription();
    const { pushManager } = stubBrowserSupport({ existingSubscription: existing });
    stubNotificationPermission("granted");
    const spy = vi.spyOn(api, "pushSubscribe").mockResolvedValue({ ok: true });

    await subscribeToKitchenPush("token-123");

    expect(pushManager.subscribe).not.toHaveBeenCalled();
    expect(spy).toHaveBeenCalledWith("token-123", expect.objectContaining({ endpoint: existing.endpoint }));
  });
});

describe("unsubscribeFromKitchenPush", () => {
  it("no hace nada si no hay suscripción activa", async () => {
    const spy = vi.spyOn(api, "pushUnsubscribe");
    await unsubscribeFromKitchenPush("token");
    expect(spy).not.toHaveBeenCalled();
  });

  it("da de baja la suscripción del navegador y avisa al backend", async () => {
    const existing = fakeSubscription("https://push.example/a-borrar");
    stubBrowserSupport({ existingSubscription: existing });
    const spy = vi.spyOn(api, "pushUnsubscribe").mockResolvedValue({ ok: true });

    await unsubscribeFromKitchenPush("token-123");

    expect(existing.unsubscribe).toHaveBeenCalledOnce();
    expect(spy).toHaveBeenCalledWith("token-123", "https://push.example/a-borrar");
  });
});
