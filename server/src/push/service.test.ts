import { afterAll, afterEach, describe, expect, it, vi } from "vitest";
import { db } from "../db.js";
import { seedTestUser } from "../../tests/helpers/seedTestUsers.js";
import { PushSubscriptionExpiredError } from "./client.js";

// Mockea solo client.ts (el punto de contacto con el proveedor push real) — el resto de
// push/service.ts corre contra la base de test real, mismo criterio que orders/service.test.ts.
// No hay ningún otro vi.mock en el backend hasta ahora porque el resto de los tests son
// integración pura contra Postgres; acá hace falta porque sendPushNotification termina llamando
// a un endpoint HTTP real de un proveedor (FCM/etc.) que no existe en este entorno de test.
vi.mock("./client.js", async importOriginal => {
  const actual = await importOriginal<typeof import("./client.js")>();
  return { ...actual, sendPushNotification: vi.fn() };
});

const { sendPushNotification } = await import("./client.js");
const { saveSubscription, deleteSubscription, notifyRole, notifyKitchenNewOrder } = await import("./service.js");

const sendMock = vi.mocked(sendPushNotification);

afterEach(async () => {
  sendMock.mockReset();
  await db.pushSubscription.deleteMany({ where: { endpoint: { startsWith: "https://push.test/" } } });
});

afterAll(async () => {
  await db.user.deleteMany({ where: { usuario: { startsWith: "push_test_" } } });
  await db.$disconnect();
});

describe("saveSubscription", () => {
  it("crea una suscripción nueva", async () => {
    const user = await seedTestUser({ usuario: "push_test_cocina_1", rol: "cocina" });
    await saveSubscription(user.id, { endpoint: "https://push.test/a", keys: { p256dh: "p1", auth: "a1" } });

    const sub = await db.pushSubscription.findUnique({ where: { endpoint: "https://push.test/a" } });
    expect(sub?.userId).toBe(user.id);
  });

  it("actualiza las keys en vez de duplicar la fila si se vuelve a suscribir el mismo endpoint", async () => {
    const user = await seedTestUser({ usuario: "push_test_cocina_2", rol: "cocina" });
    await saveSubscription(user.id, { endpoint: "https://push.test/b", keys: { p256dh: "viejo", auth: "viejo" } });
    await saveSubscription(user.id, { endpoint: "https://push.test/b", keys: { p256dh: "nuevo", auth: "nuevo" } });

    const subs = await db.pushSubscription.findMany({ where: { endpoint: "https://push.test/b" } });
    expect(subs).toHaveLength(1);
    expect(subs[0].p256dh).toBe("nuevo");
  });

  it("reasigna el dueño si el mismo endpoint (tablet compartida) pasa a otro usuario", async () => {
    const userA = await seedTestUser({ usuario: "push_test_cocina_3a", rol: "cocina" });
    const userB = await seedTestUser({ usuario: "push_test_cocina_3b", rol: "cocina" });
    await saveSubscription(userA.id, { endpoint: "https://push.test/c", keys: { p256dh: "p", auth: "a" } });
    await saveSubscription(userB.id, { endpoint: "https://push.test/c", keys: { p256dh: "p", auth: "a" } });

    const sub = await db.pushSubscription.findUnique({ where: { endpoint: "https://push.test/c" } });
    expect(sub?.userId).toBe(userB.id);
  });
});

describe("deleteSubscription", () => {
  it("borra una suscripción existente", async () => {
    const user = await seedTestUser({ usuario: "push_test_cocina_4", rol: "cocina" });
    await saveSubscription(user.id, { endpoint: "https://push.test/d", keys: { p256dh: "p", auth: "a" } });
    await deleteSubscription("https://push.test/d");
    expect(await db.pushSubscription.findUnique({ where: { endpoint: "https://push.test/d" } })).toBeNull();
  });

  it("no tira error al borrar un endpoint que no existe", async () => {
    await expect(deleteSubscription("https://push.test/no-existe")).resolves.toBeUndefined();
  });
});

describe("notifyRole", () => {
  it("no tira nada si el rol no tiene ninguna suscripción activa", async () => {
    await expect(notifyRole("cocina", { title: "t", body: "b" })).resolves.toBeUndefined();
    expect(sendMock).not.toHaveBeenCalled();
  });

  it("envía la notificación a cada suscripción del rol", async () => {
    const user = await seedTestUser({ usuario: "push_test_cocina_5", rol: "cocina" });
    await saveSubscription(user.id, { endpoint: "https://push.test/e", keys: { p256dh: "p", auth: "a" } });
    sendMock.mockResolvedValue(undefined);

    await notifyRole("cocina", { title: "Nuevo pedido", body: "Pedido #007" });

    expect(sendMock).toHaveBeenCalledWith(
      { endpoint: "https://push.test/e", keys: { p256dh: "p", auth: "a" } },
      { title: "Nuevo pedido", body: "Pedido #007" }
    );
  });

  it("nunca propaga un error de envío — lo loguea y sigue", async () => {
    const user = await seedTestUser({ usuario: "push_test_cocina_6", rol: "cocina" });
    await saveSubscription(user.id, { endpoint: "https://push.test/f", keys: { p256dh: "p", auth: "a" } });
    sendMock.mockRejectedValue(new Error("proveedor caído"));
    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    await expect(notifyRole("cocina", { title: "t", body: "b" })).resolves.toBeUndefined();
    expect(consoleSpy).toHaveBeenCalled();
    consoleSpy.mockRestore();
  });

  it("borra la suscripción si el proveedor confirma que ya venció (404/410)", async () => {
    const user = await seedTestUser({ usuario: "push_test_cocina_7", rol: "cocina" });
    await saveSubscription(user.id, { endpoint: "https://push.test/g", keys: { p256dh: "p", auth: "a" } });
    sendMock.mockRejectedValue(new PushSubscriptionExpiredError());

    await notifyRole("cocina", { title: "t", body: "b" });

    expect(await db.pushSubscription.findUnique({ where: { endpoint: "https://push.test/g" } })).toBeNull();
  });
});

describe("notifyKitchenNewOrder", () => {
  it("arma el body con el horario de retiro cuando el pedido lo tiene", async () => {
    const user = await seedTestUser({ usuario: "push_test_cocina_8", rol: "cocina" });
    await saveSubscription(user.id, { endpoint: "https://push.test/h", keys: { p256dh: "p", auth: "a" } });
    sendMock.mockResolvedValue(undefined);

    await notifyKitchenNewOrder({ orderNumber: "007", estimatedTime: "20:30" });

    expect(sendMock).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ title: "Nuevo pedido", body: "Pedido #007 — retiro 20:30" })
    );
  });
});
