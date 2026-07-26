import { Router } from "express";
import { requireAuth, requireRole } from "../auth/middleware.js";
import { asyncHandler } from "../lib/asyncHandler.js";
import { getSlotWindows, updateSlotWindows, InvalidSlotWindowError } from "./service.js";
import type { SlotWindowDay } from "./types.js";

export const slotWindowsRouter = Router();

// Todo el router es solo-cocina: ni admin ni recepción gestionan la grilla de turnos (misma
// decisión de producto que separó las secciones de staff en AppStaff.tsx — cada rol ve
// únicamente la suya). A diferencia de BusinessHours, acá ni el GET es público: el rango de
// retiro programable no hace falta exponerlo aparte, el cliente ya lo ve reflejado en
// GET /api/orders/slots (que internamente consulta esta misma ventana).
slotWindowsRouter.use(requireAuth, requireRole("cocina"));

slotWindowsRouter.get("/", asyncHandler(async (_req, res) => {
  res.json(await getSlotWindows());
}));

// Reemplaza la ventana de la semana completa (mismo criterio que PUT /api/business-hours: se
// manda siempre la semana entera, no un patch parcial).
slotWindowsRouter.put("/", asyncHandler(async (req, res) => {
  const body = req.body as { days?: SlotWindowDay[] };
  if (!Array.isArray(body.days)) {
    res.status(400).json({ error: 'Falta "days" (array con los 7 días de la semana)' });
    return;
  }
  try {
    res.json(await updateSlotWindows(body.days));
  } catch (err) {
    if (err instanceof InvalidSlotWindowError) {
      res.status(400).json({ error: err.message });
      return;
    }
    throw err;
  }
}));
