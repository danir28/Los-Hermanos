import { Router } from "express";
import { requireAuth, requireRole } from "../auth/middleware.js";
import { asyncHandler } from "../lib/asyncHandler.js";
import { getBusinessHours, updateBusinessHours, InvalidBusinessHoursError } from "./service.js";
import type { DaySchedule } from "./types.js";

export const businessHoursRouter = Router();

// Devuelve el horario de la semana + si el local está abierto ahora. Pública: la usa la
// Home del cliente para mostrar el horario y decidir si bloquea el checkout online.
businessHoursRouter.get("/", asyncHandler(async (_req, res) => {
  res.json(await getBusinessHours());
}));

// Reemplaza el horario de la semana completa. Solo-admin (requireAuth/requireRole puestos acá,
// no con router.use, para que el GET de arriba quede público).
businessHoursRouter.put("/", requireAuth, requireRole("admin"), asyncHandler(async (req, res) => {
  const body = req.body as { days?: DaySchedule[] };
  if (!Array.isArray(body.days)) {
    res.status(400).json({ error: 'Falta "days" (array con los 7 días de la semana)' });
    return;
  }
  try {
    res.json(await updateBusinessHours(body.days));
  } catch (err) {
    if (err instanceof InvalidBusinessHoursError) {
      res.status(400).json({ error: err.message });
      return;
    }
    throw err;
  }
}));
