import request from "supertest";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { app } from "../../src/app.js";
import { db } from "../../src/db.js";
import { seedTestUser } from "../helpers/seedTestUsers.js";

let cocinaToken: string;
let adminToken: string;

beforeAll(async () => {
  await seedTestUser({ usuario: "route_test_push_cocina", rol: "cocina" });
  const res = await request(app).post("/api/auth/login").send({ usuario: "route_test_push_cocina", password: "clave-test" });
  cocinaToken = res.body.token;

  await seedTestUser({ usuario: "route_test_push_admin", rol: "admin" });
  const res2 = await request(app).post("/api/auth/login").send({ usuario: "route_test_push_admin", password: "clave-test" });
  adminToken = res2.body.token;
});

afterAll(async () => {
  await db.user.deleteMany({ where: { usuario: { in: ["route_test_push_cocina", "route_test_push_admin"] } } });
  await db.$disconnect();
});

describe("POST /api/push/subscribe", () => {
  it("responde 401 sin token", async () => {
    const res = await request(app).post("/api/push/subscribe").send({});
    expect(res.status).toBe(401);
  });

  it("responde 403 con un token que no es de cocina (solo-cocina)", async () => {
    const res = await request(app)
      .post("/api/push/subscribe")
      .set("Authorization", `Bearer ${adminToken}`)
      .send({ endpoint: "https://push.test/route-1", keys: { p256dh: "p", auth: "a" } });
    expect(res.status).toBe(403);
  });

  it("responde 400 si faltan datos de la suscripción", async () => {
    const res = await request(app)
      .post("/api/push/subscribe")
      .set("Authorization", `Bearer ${cocinaToken}`)
      .send({ endpoint: "https://push.test/route-2" });
    expect(res.status).toBe(400);
  });

  it("guarda la suscripción con un token de cocina válido", async () => {
    const res = await request(app)
      .post("/api/push/subscribe")
      .set("Authorization", `Bearer ${cocinaToken}`)
      .send({ endpoint: "https://push.test/route-3", keys: { p256dh: "p", auth: "a" } });
    expect(res.status).toBe(201);

    const sub = await db.pushSubscription.findUnique({ where: { endpoint: "https://push.test/route-3" } });
    expect(sub).not.toBeNull();
    await db.pushSubscription.deleteMany({ where: { endpoint: "https://push.test/route-3" } });
  });
});

describe("POST /api/push/unsubscribe", () => {
  it("responde 401 sin token", async () => {
    const res = await request(app).post("/api/push/unsubscribe").send({ endpoint: "https://push.test/route-4" });
    expect(res.status).toBe(401);
  });

  it("responde 400 si falta el endpoint", async () => {
    const res = await request(app)
      .post("/api/push/unsubscribe")
      .set("Authorization", `Bearer ${cocinaToken}`)
      .send({});
    expect(res.status).toBe(400);
  });

  it("borra la suscripción con un token de cocina válido", async () => {
    await request(app)
      .post("/api/push/subscribe")
      .set("Authorization", `Bearer ${cocinaToken}`)
      .send({ endpoint: "https://push.test/route-5", keys: { p256dh: "p", auth: "a" } });

    const res = await request(app)
      .post("/api/push/unsubscribe")
      .set("Authorization", `Bearer ${cocinaToken}`)
      .send({ endpoint: "https://push.test/route-5" });
    expect(res.status).toBe(200);
    expect(await db.pushSubscription.findUnique({ where: { endpoint: "https://push.test/route-5" } })).toBeNull();
  });

  it("responde 200 aunque el endpoint no exista (idempotente)", async () => {
    const res = await request(app)
      .post("/api/push/unsubscribe")
      .set("Authorization", `Bearer ${cocinaToken}`)
      .send({ endpoint: "https://push.test/no-existe" });
    expect(res.status).toBe(200);
  });
});
