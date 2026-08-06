-- Sistema de opciones dinámicas por categoría (empanadas/mitad pizza sin duplicar sabores a
-- mano, ver schema.prisma para el detalle de cada campo). Ambas columnas son additive con
-- default, no requieren backfill en dos pasos (a diferencia de add_order_number_reset_step1/2).

-- AlterTable
ALTER TABLE "products" ADD COLUMN "offerAsOption" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "product_option_groups" ADD COLUMN "sourceCategory" TEXT;
