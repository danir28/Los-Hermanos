import bcrypt from "bcryptjs";
import type { UserRole } from "../../src/auth/types.js";
import { db } from "../../src/db.js";

// Costo de bcrypt bajo (4, no el 10 de producción) para no pagar el costo real de hashing en
// cada corrida de tests — acá no se está probando la seguridad del hash, solo la lógica de
// login. Upsert por "usuario" (mismo patrón que prisma/seed.ts) para que un test pueda pedir
// el mismo usuario de test varias veces sin chocar con un unique constraint.
const TEST_BCRYPT_COST = 4;

export async function seedTestUser(input: { usuario: string; rol: UserRole; password?: string; activo?: boolean }) {
  const password = input.password ?? "clave-test";
  const passwordHash = await bcrypt.hash(password, TEST_BCRYPT_COST);
  return db.user.upsert({
    where: { usuario: input.usuario },
    update: { passwordHash, rol: input.rol, activo: input.activo ?? true },
    create: {
      nombre: `Usuario Test (${input.rol})`,
      usuario: input.usuario,
      email: `${input.usuario}@example.com`,
      passwordHash,
      rol: input.rol,
      activo: input.activo ?? true,
    },
  });
}
