-- Paso 1 de 2 de la migración a numeración de pedidos por jornada comercial (reset diario a
-- las 7am, ver server/src/orders/businessDay.ts). businessDate va nullable acá a propósito:
-- se backfillea en el paso 2 antes de hacerla NOT NULL, para no romper los pedidos existentes.

-- orderNumber deja de ser único globalmente (ahora se repite entre jornadas distintas) y deja
-- de autoincrementarse en Postgres (el próximo número lo asigna la app vía OrderCounter).
DROP INDEX "orders_orderNumber_key";
ALTER TABLE "orders" ALTER COLUMN "orderNumber" DROP DEFAULT;

-- AlterTable
ALTER TABLE "orders" ADD COLUMN "businessDate" DATE;

-- Único por jornada en vez de único global.
CREATE UNIQUE INDEX "orders_businessDate_orderNumber_key" ON "orders"("businessDate", "orderNumber");

-- CreateTable
CREATE TABLE "order_counters" (
    "businessDate" DATE NOT NULL,
    "lastNumber" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "order_counters_pkey" PRIMARY KEY ("businessDate")
);
