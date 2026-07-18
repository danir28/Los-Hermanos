import "dotenv/config";
import bcrypt from "bcryptjs";
import { db } from "../src/db.js";
import { USER_ROLES } from "../src/auth/types.js";
import type { UserRole } from "../src/auth/types.js";

// Alta idempotente (upsert por "usuario") del primer usuario de staff, a partir de
// variables de entorno — no hay pantalla CRUD todavía (queda para Sprint 2), así que
// este script es la única forma de crear cuentas por ahora. Volver a correrlo con
// otros valores de SEED_ADMIN_* (incluyendo SEED_ADMIN_ROL) da de alta las cuentas
// de recepcionista y cocina.
async function main() {
  const nombre = process.env.SEED_ADMIN_NOMBRE;
  const usuario = process.env.SEED_ADMIN_USUARIO;
  const email = process.env.SEED_ADMIN_EMAIL;
  const password = process.env.SEED_ADMIN_PASSWORD;
  const rol = process.env.SEED_ADMIN_ROL || "admin";

  if (!nombre || !usuario || !email || !password) {
    throw new Error(
      'Faltan variables de entorno: "SEED_ADMIN_NOMBRE", "SEED_ADMIN_USUARIO", "SEED_ADMIN_EMAIL", "SEED_ADMIN_PASSWORD"'
    );
  }
  if (!USER_ROLES.includes(rol as UserRole)) {
    throw new Error(`"SEED_ADMIN_ROL" inválido ("${rol}"). Debe ser uno de: ${USER_ROLES.join(", ")}`);
  }

  const passwordHash = await bcrypt.hash(password, 10);

  const user = await db.user.upsert({
    where: { usuario },
    update: { nombre, email, passwordHash, rol },
    create: { nombre, usuario, email, passwordHash, rol },
  });

  console.log(`Usuario "${user.usuario}" (${user.rol}) creado/actualizado correctamente.`);
}

main()
  .catch(err => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(() => db.$disconnect());
