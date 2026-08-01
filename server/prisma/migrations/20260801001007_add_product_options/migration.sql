-- Sistema genérico de opciones de producto (grupos de selección única/múltiple/cantidad a
-- repartir + sus opciones con precio extra), reutilizable para cualquier variante de producto
-- sin hardcodear lógica por producto (ver Mitad pizza, Empanadas, Sandwich de milanesa).

CREATE TABLE "product_option_groups" (
    "id" SERIAL NOT NULL,
    "productId" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "selectionType" TEXT NOT NULL,
    "required" BOOLEAN NOT NULL DEFAULT false,
    "quantityTarget" INTEGER,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "product_option_groups_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "product_option_groups_productId_idx" ON "product_option_groups"("productId");

ALTER TABLE "product_option_groups" ADD CONSTRAINT "product_option_groups_productId_fkey"
    FOREIGN KEY ("productId") REFERENCES "products"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "product_options" (
    "id" SERIAL NOT NULL,
    "groupId" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "priceDelta" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "product_options_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "product_options_groupId_idx" ON "product_options"("groupId");

ALTER TABLE "product_options" ADD CONSTRAINT "product_options_groupId_fkey"
    FOREIGN KEY ("groupId") REFERENCES "product_option_groups"("id") ON DELETE CASCADE ON UPDATE CASCADE;
