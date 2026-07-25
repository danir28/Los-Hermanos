import request from "supertest";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { app } from "../../src/app.js";
import { db } from "../../src/db.js";
import { seedTestUser } from "../helpers/seedTestUsers.js";

let adminToken: string;

beforeAll(async () => {
  await seedTestUser({ usuario: "route_test_orders_admin", rol: "admin" });
  const res = await request(app).post("/api/auth/login").send({ usuario: "route_test_orders_admin", password: "clave-test" });
  adminToken = res.body.token;
});

afterAll(async () => {
  await db.user.deleteMany({ where: { usuario: "route_test_orders_admin" } });
  await db.$disconnect();
});

describe("POST /api/orders", () => {
  it("responde 400 si faltan datos obligatorios (pública, sin token)", async () => {
    const res = await request(app).post("/api/orders").send({ customer: "Solo nombre" });
    expect(res.status).toBe(400);
    expect(res.body.error).toEqual(expect.any(String));
  });
});

describe("GET /api/orders", () => {
  it("responde 401 sin token", async () => {
    const res = await request(app).get("/api/orders");
    expect(res.status).toBe(401);
  });

  it("responde 200 con un token válido de rol admin", async () => {
    const res = await request(app).get("/api/orders").set("Authorization", `Bearer ${adminToken}`);
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
  });
});

describe("PATCH /api/orders/:id", () => {
  it("responde 401 sin token", async () => {
    const res = await request(app).patch("/api/orders/00000000-0000-0000-0000-000000000000").send({ status: "Cancelado" });
    expect(res.status).toBe(401);
  });

  it("responde 404 con un id inexistente y token válido", async () => {
    const res = await request(app)
      .patch("/api/orders/00000000-0000-0000-0000-000000000000")
      .set("Authorization", `Bearer ${adminToken}`)
      .send({ status: "Cancelado" });
    expect(res.status).toBe(404);
  });
});
