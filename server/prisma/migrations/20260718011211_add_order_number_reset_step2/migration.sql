-- Paso 2 de 2: ya se backfilleó businessDate en todos los pedidos existentes
-- (server/scripts/backfill-business-date.ts, corrido una vez y borrado), así que ahora se
-- puede hacer obligatoria.
ALTER TABLE "orders" ALTER COLUMN "businessDate" SET NOT NULL;
