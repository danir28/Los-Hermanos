-- Reemplaza el par único startTime/endTime por un array JSON "ranges", mismo patrón que
-- business_hours_multiple_ranges: soporta franjas de retiro múltiples por día (ej. una franja
-- de mediodía y otra de noche, calcadas del horario de atención partido del local) y permite
-- validar cada franja contra BusinessHours (ver slotWindows/service.ts).

-- AlterTable
ALTER TABLE "slot_windows" ADD COLUMN "ranges" JSONB;

-- Backfill: cada fila existente tenía exactamente una franja.
UPDATE "slot_windows"
SET "ranges" = jsonb_build_array(jsonb_build_object('startTime', "startTime", 'endTime', "endTime"));

-- AlterTable
ALTER TABLE "slot_windows" ALTER COLUMN "ranges" SET NOT NULL;
ALTER TABLE "slot_windows" DROP COLUMN "startTime";
ALTER TABLE "slot_windows" DROP COLUMN "endTime";
