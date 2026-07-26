-- CreateTable
CREATE TABLE "slot_windows" (
    "dayOfWeek" INTEGER NOT NULL,
    "startTime" TEXT NOT NULL,
    "endTime" TEXT NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "slot_windows_pkey" PRIMARY KEY ("dayOfWeek")
);

-- Seed: mismo rango que hoy está hardcodeado en orders/slots.ts (SLOT_RANGE_START/END,
-- 19:00 a 22:55), para los 7 días — así el comportamiento no cambia hasta que cocina lo
-- edite a mano desde la nueva pantalla.
INSERT INTO "slot_windows" ("dayOfWeek", "startTime", "endTime", "updatedAt")
SELECT day, '19:00', '22:55', now()
FROM generate_series(0, 6) AS day;
