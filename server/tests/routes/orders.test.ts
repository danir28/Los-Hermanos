import request from "supertest";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { app } from "../../src/app.js";
import { db } from "../../src/db.js";
import { seedTestUser } from "../helpers/seedTestUsers.js";

let adminToken: string;
let recepcionistaToken: string;

beforeAll(async () => {
  await seedTestUser({ usuario: "route_test_orders_admin", rol: "admin" });
  const res = await request(app).post("/api/auth/login").send({ usuario: "route_test_orders_admin", password: "clave-test" });
  adminToken = res.body.token;

  await seedTestUser({ usuario: "route_test_orders_recepcionista", rol: "recepcionista" });
  const res2 = await request(app).post("/api/auth/login").send({ usuario: "route_test_orders_recepcionista", password: "clave-test" });
  recepcionistaToken = res2.body.token;
});

afterAll(async () => {
  await db.user.deleteMany({ where: { usuario: { in: ["route_test_orders_admin", "route_test_orders_recepcionista"] } } });
  await db.$disconnect();
});

describe("POST /api/orders", () => {
  it("responde 400 si faltan datos obligatorios (pública, sin token)", async () => {
    const res = await request(app).post("/api/orders").send({ customer: "Solo nombre" });
    expect(res.status).toBe(400);
    expect(res.body.error).toEqual(expect.any(String));
  });

  it("responde 400 si el teléfono trae algo que no sea un dígito", async () => {
    const res = await request(app).post("/api/orders").send({
      customer: "Cliente Teléfono Inválido",
      phone: "11-2345-6789",
      type: "presencial",
      estimatedTime: "19:00",
      items: [{ name: "Empanada de carne", qty: 1, price: 1500 }],
    });
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

describe("DELETE /api/orders/:id", () => {
  it("responde 401 sin token", async () => {
    const res = await request(app).delete("/api/orders/00000000-0000-0000-0000-000000000000");
    expect(res.status).toBe(401);
  });

  it("responde 403 con un token de recepcionista (solo-admin)", async () => {
    const res = await request(app)
      .delete("/api/orders/00000000-0000-0000-0000-000000000000")
      .set("Authorization", `Bearer ${recepcionistaToken}`);
    expect(res.status).toBe(403);
  });

  it("responde 404 con un id inexistente y token de admin", async () => {
    const res = await request(app)
      .delete("/api/orders/00000000-0000-0000-0000-000000000000")
      .set("Authorization", `Bearer ${adminToken}`);
    expect(res.status).toBe(404);
  });

  it("borra el pedido (y sus ítems en cascada) con token de admin", async () => {
    const order = await db.order.create({
      data: {
        orderNumber: 999001,
        businessDate: new Date("2020-01-01"),
        customer: "Cliente Borrado",
        phone: "99999000001",
        type: "presencial",
        status: "Entregado",
        total: 1000,
        items: { create: [{ name: "Empanada", qty: 1, price: 1000 }] },
      },
    });

    const res = await request(app).delete(`/api/orders/${order.id}`).set("Authorization", `Bearer ${adminToken}`);
    expect(res.status).toBe(200);
    expect(await db.order.findUnique({ where: { id: order.id } })).toBeNull();
    expect(await db.orderItem.findFirst({ where: { orderId: order.id } })).toBeNull();
  });
});
