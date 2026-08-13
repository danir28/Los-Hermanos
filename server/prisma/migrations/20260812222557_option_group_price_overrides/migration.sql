-- Precio por defecto para un grupo dinámico ("vinculado a categoría") + overrides puntuales por
-- producto fuente, para que un grupo así pueda tener un sabor con precio distinto (ej. "Mitad
-- pizza": todos los sabores valen $8500 como mitad salvo "Super", que vale $10000) sin volver a
-- tipear la lista de sabores a mano en un grupo manual aparte.

ALTER TABLE "product_option_groups" ADD COLUMN "defaultPriceDelta" DECIMAL(10,2) NOT NULL DEFAULT 0;

ALTER TABLE "product_options" ADD COLUMN "sourceProductId" INTEGER;

CREATE UNIQUE INDEX "product_options_groupId_sourceProductId_key" ON "product_options"("groupId", "sourceProductId");

ALTER TABLE "product_options" ADD CONSTRAINT "product_options_sourceProductId_fkey"
    FOREIGN KEY ("sourceProductId") REFERENCES "products"("id") ON DELETE CASCADE ON UPDATE CASCADE;
