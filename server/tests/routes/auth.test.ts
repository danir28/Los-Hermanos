import request from "supertest";
import { afterAll, afterEach, describe, expect, it } from "vitest";
import { app } from "../../src/app.js";
import { db } from "../../src/db.js";
import { seedTestUser } from "../helpers/seedTestUsers.js";

afterEach(async () => {
  await db.user.deleteMany({ where: { usuario: { startsWith: "route_test_" } } });
});

afterAll(async () => {
  await db.$disconnect();
});

describe("POST /api/auth/login", () => {
  it("responde 400 si faltan usuario/password", async () => {
    const res = await request(app).post("/api/auth/login").send({ usuario: "x" });
    expect(res.status).toBe(400);
  });

  it("responde 401 con credenciales inválidas", async () => {
    const res = await request(app).post("/api/auth/login").send({ usuario: "no-existe", password: "nada" });
    expect(res.status).toBe(401);
  });

  it("devuelve token y perfil con credenciales válidas, y GET /me lo confirma", async () => {
    await seedTestUser({ usuario: "route_test_admin", rol: "admin", password: "clave-test" });

    const loginRes = await request(app).post("/api/auth/login").send({ usuario: "route_test_admin", password: "clave-test" });
    expect(loginRes.status).toBe(200);
    expect(loginRes.body.token).toEqual(expect.any(String));
    expect(loginRes.body.user).not.toHaveProperty("passwordHash");

    const meRes = await request(app).get("/api/auth/me").set("Authorization", `Bearer ${loginRes.body.token}`);
    expect(meRes.status).toBe(200);
    expect(meRes.body.usuario).toBe("route_test_admin");
  });
});
