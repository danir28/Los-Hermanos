-- Reemplaza el par único openTime/closeTime por un array JSON "ranges" para soportar
-- horario partido (ej. abre 11-15 y vuelve a abrir 19-23 el mismo día). Se agrega la
-- columna nullable, se backfillea desde los datos existentes y recién después se dropean
-- las columnas viejas y se vuelve NOT NULL (sin wizard interactivo, ver ERRORS en CLAUDE.md).

-- AlterTable
ALTER TABLE "business_hours" ADD COLUMN "ranges" JSONB;

-- Backfill: cada fila existente tenía exactamente una franja.
UPDATE "business_hours"
SET "ranges" = jsonb_build_array(jsonb_build_object('openTime', "openTime", 'closeTime', "closeTime"));

-- AlterTable
ALTER TABLE "business_hours" ALTER COLUMN "ranges" SET NOT NULL;
ALTER TABLE "business_hours" DROP COLUMN "openTime";
ALTER TABLE "business_hours" DROP COLUMN "closeTime";
