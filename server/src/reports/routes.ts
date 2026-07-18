import { Router } from "express";
import { requireAuth, requireRole } from "../auth/middleware.js";
import { getMonthlyReport, InvalidMonthError } from "./service.js";

export const reportsRouter = Router();

// Todo el módulo de reportes es solo-admin: cifras de ventas y top de productos no
// deben ser accesibles ni para recepción ni para cocina.
reportsRouter.use(requireAuth, requireRole("admin"));

// Devuelve ventas totales, cantidad de pedidos entregados y top 5 de productos de un mes.
reportsRouter.get("/monthly", async (req, res) => {
  const month = req.query.month;
  if (typeof month !== "string" || !month) {
    res.status(400).json({ error: 'Falta el parámetro "month" (formato "YYYY-MM")' });
    return;
  }
  try {
    res.json(await getMonthlyReport(month));
  } catch (err) {
    if (err instanceof InvalidMonthError) {
      res.status(400).json({ error: err.message });
      return;
    }
    res.status(500).json({ error: err instanceof Error ? err.message : "Error desconocido al generar el reporte" });
  }
});
