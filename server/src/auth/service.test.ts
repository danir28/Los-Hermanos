import bcrypt from "bcryptjs";
import { afterAll, afterEach, describe, expect, it } from "vitest";
import { db } from "../db.js";
import { InactiveUserError, InvalidCredentialsError, getUserById, login } from "./service.js";
import type { UserRole } from "./types.js";

// Integración: contra los_hermanos_test real (necesita el unique constraint de "usuario" y el
// hash real de bcrypt, no tiene sentido mockear Prisma acá). Costo de bcrypt bajo (4) para no
// pagar el costo real de producción en cada corrida.
const TEST_BCRYPT_COST = 4;

async function createTestUser(overrides: { usuario: string; password?: string; rol?: UserRole; activo?: boolean }) {
  const password = overrides.password ?? "clave-correcta";
  const passwordHash = await bcrypt.hash(password, TEST_BCRYPT_COST);
  return db.user.create({
    data: {
      nombre: "Usuario de Test",
      usuario: overrides.usuario,
      email: `${overrides.usuario}@example.com`,
      passwordHash,
      rol: overrides.rol ?? "admin",
      activo: overrides.activo ?? true,
    },
  });
}

afterEach(async () => {
  await db.user.deleteMany({ where: { usuario: { startsWith: "login_test_" } } });
});

afterAll(async () => {
  await db.$disconnect();
});

describe("login", () => {
  it("devuelve un token y el perfil sin passwordHash con credenciales correctas", async () => {
    await createTestUser({ usuario: "login_test_ok", password: "clave-correcta" });
    const result = await login("login_test_ok", "clave-correcta");
    expect(result.token).toEqual(expect.any(String));
    expect(result.user.usuario).toBe("login_test_ok");
    expect(result.user).not.toHaveProperty("passwordHash");
  });

  it("tira InvalidCredentialsError con un usuario inexistente", async () => {
    await expect(login("no_existe_este_usuario", "cualquiera")).rejects.toThrow(InvalidCredentialsError);
  });

  it("tira InvalidCredentialsError con la contraseña incorrecta (mismo error que usuario inexistente, sin distinguir cuál falló)", async () => {
    await createTestUser({ usuario: "login_test_wrongpass", password: "clave-correcta" });
    await expect(login("login_test_wrongpass", "clave-incorrecta")).rejects.toThrow(InvalidCredentialsError);
  });

  it("tira InactiveUserError con credenciales correctas pero usuario desactivado", async () => {
    await createTestUser({ usuario: "login_test_inactive", password: "clave-correcta", activo: false });
    await expect(login("login_test_inactive", "clave-correcta")).rejects.toThrow(InactiveUserError);
  });

  it("un usuario inactivo con contraseña incorrecta da InvalidCredentialsError, no InactiveUserError (la contraseña se valida primero)", async () => {
    await createTestUser({ usuario: "login_test_inactive_wrongpass", password: "clave-correcta", activo: false });
    await expect(login("login_test_inactive_wrongpass", "otra-clave")).rejects.toThrow(InvalidCredentialsError);
  });
});

describe("getUserById", () => {
  it("devuelve null si el id no existe", async () => {
    expect(await getUserById("00000000-0000-0000-0000-000000000000")).toBeNull();
  });

  it("devuelve el perfil actualizado de un usuario existente", async () => {
    const user = await createTestUser({ usuario: "login_test_getbyid" });
    const profile = await getUserById(user.id);
    expect(profile?.usuario).toBe("login_test_getbyid");
  });
});
