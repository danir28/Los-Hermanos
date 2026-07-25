import { execFileSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { TEST_PRODUCT, TEST_USERS } from "./fixtures.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const SERVER_DIR = path.resolve(__dirname, "../../server");

// Misma base que server/.env.test (Tanda 1) — se repite acá en vez de leerla porque este
// script corre desde la raíz, fuera del proceso de server/, y es un dato de test, no un secreto.
const TEST_DATABASE_URL = "postgresql://los_hermanos_app:los_hermanos7@localhost:5432/los_hermanos_test";

// Da de alta (o actualiza) las 3 cuentas de staff de test y un producto de catálogo contra
// los_hermanos_test, reusando los mismos scripts que usa el proyecto para altas reales
// (server/prisma/seed.ts) — así los specs loguean contra credenciales reales, no un mock de
// auth. Todo es idempotente (upsert por usuario / findFirst+update por nombre de producto), así
// que correr la suite varias veces no acumula cuentas ni productos duplicados.
export default async function globalSetup() {
  for (const { usuario, password, rol } of Object.values(TEST_USERS)) {
    execFileSync("npx", ["tsx", "prisma/seed.ts"], {
      cwd: SERVER_DIR,
      stdio: "inherit",
      env: {
        ...process.env,
        DATABASE_URL: TEST_DATABASE_URL,
        SEED_ADMIN_NOMBRE: `Usuario Test (${rol})`,
        SEED_ADMIN_USUARIO: usuario,
        SEED_ADMIN_EMAIL: `${usuario}@example.com`,
        SEED_ADMIN_PASSWORD: password,
        SEED_ADMIN_ROL: rol,
      },
    });
  }

  execFileSync("npx", ["tsx", "tests/fixtures/seedTestProduct.ts"], {
    cwd: SERVER_DIR,
    stdio: "inherit",
    env: {
      ...process.env,
      DATABASE_URL: TEST_DATABASE_URL,
      SEED_PRODUCT_NAME: TEST_PRODUCT.name,
      SEED_PRODUCT_CATEGORY: TEST_PRODUCT.category,
      SEED_PRODUCT_PRICE: String(TEST_PRODUCT.price),
      SEED_PRODUCT_DESCRIPTION: TEST_PRODUCT.description,
      SEED_PRODUCT_IMAGE: TEST_PRODUCT.image,
    },
  });
}
