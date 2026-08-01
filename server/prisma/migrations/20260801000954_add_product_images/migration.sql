-- Reemplaza Product.image (una sola URL) por una tabla product_images (varias fotos, ordenadas
-- por sortOrder) para soportar el carrusel de fotos por producto.

CREATE TABLE "product_images" (
    "id" SERIAL NOT NULL,
    "productId" INTEGER NOT NULL,
    "url" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "product_images_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "product_images_productId_idx" ON "product_images"("productId");

ALTER TABLE "product_images" ADD CONSTRAINT "product_images_productId_fkey"
    FOREIGN KEY ("productId") REFERENCES "products"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Backfill: cada producto existente conserva su foto actual como la primera (sortOrder=0) del carrusel.
INSERT INTO "product_images" ("productId", "url", "sortOrder")
SELECT "id", "image", 0 FROM "products";

ALTER TABLE "products" DROP COLUMN "image";
