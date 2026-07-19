-- CreateTable
CREATE TABLE "business_hours" (
    "dayOfWeek" INTEGER NOT NULL,
    "isOpen" BOOLEAN NOT NULL DEFAULT true,
    "openTime" TEXT NOT NULL,
    "closeTime" TEXT NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "business_hours_pkey" PRIMARY KEY ("dayOfWeek")
);

-- Seed: mismo horario que hoy está hardcodeado en CustomerHome.tsx, para no cambiar el
-- comportamiento visible hasta que el admin lo edite desde la nueva pantalla.
INSERT INTO "business_hours" ("dayOfWeek","isOpen","openTime","closeTime","updatedAt") VALUES
(0, true, '11:00', '20:00', now()), -- domingo
(1, true, '10:00', '21:00', now()), -- lunes
(2, true, '10:00', '21:00', now()), -- martes
(3, true, '10:00', '21:00', now()), -- miércoles
(4, true, '10:00', '21:00', now()), -- jueves
(5, true, '10:00', '21:00', now()), -- viernes
(6, true, '10:00', '22:00', now()); -- sábado
