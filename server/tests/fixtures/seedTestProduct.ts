import "dotenv/config";
import { db } from "../../src/db.js";

// Siembra (idempotente, por nombre) un producto de catálogo — usado por el global-setup de
// Playwright (tests/e2e/global-setup.ts) para que los specs de cliente/recepción tengan algo
// para agregar al carrito. El modelo Product no tiene un unique constraint sobre "name" (ver
// schema.prisma), así que se hace un findFirst + update/create en vez de un upsert real.
async function main() {
  const name = process.env.SEED_PRODUCT_NAME;
  const category = process.env.SEED_PRODUCT_CATEGORY;
  const price = Number(process.env.SEED_PRODUCT_PRICE);
  const description = process.env.SEED_PRODUCT_DESCRIPTION ?? "";
  const image = process.env.SEED_PRODUCT_IMAGE ?? "";

  if (!name || !category || !Number.isFinite(price)) {
    throw new Error('Faltan variables de entorno: "SEED_PRODUCT_NAME", "SEED_PRODUCT_CATEGORY", "SEED_PRODUCT_PRICE"');
  }

  const existing = await db.product.findFirst({ where: { name } });
  const data = { category, price, description, image, active: true, outOfStock: false };
  const product = existing
    ? await db.product.update({ where: { id: existing.id }, data })
    : await db.product.create({ data: { name, ...data, featured: false } });

  console.log(`Producto de test "${product.name}" (id ${product.id}) listo.`);
}

main()
  .catch(err => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(() => db.$disconnect());
