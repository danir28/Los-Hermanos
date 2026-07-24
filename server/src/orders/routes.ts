import { Router } from "express";
import { requireAuth, requireRole } from "../auth/middleware.js";
import { asyncHandler } from "../lib/asyncHandler.js";
import { createOrder, getSlotAvailability, listOrders, lookupOrder, updateOrder, BusinessClosedError, OrderNotFoundError } from "./service.js";
import { InvalidSlotError, SlotFullError } from "./slots.js";
import type { CreateOrderInput, UpdateOrderInput } from "./types.js";

export const ordersRouter = Router();

// Crea un pedido nuevo a partir de cliente, teléfono, ítems y canal de origen. Pública:
// la usan tanto el cliente (checkout) como recepción (alta manual presencial/telefónica).
ordersRouter.post("/", asyncHandler(async (req, res) => {
  const body = req.body as Partial<CreateOrderInput>;
  if (!body.customer || !body.phone || !body.type || !Array.isArray(body.items) || body.items.length === 0) {
    res.status(400).json({ error: 'Faltan datos del pedido ("customer", "phone", "type", "items")' });
    return;
  }
  try {
    const order = await createOrder(body as CreateOrderInput);
    res.json(order);
  } catch (err) {
    if (err instanceof BusinessClosedError || err instanceof SlotFullError) {
      res.status(409).json({ error: err.message });
      return;
    }
    if (err instanceof InvalidSlotError) {
      res.status(400).json({ error: err.message });
      return;
    }
    throw err;
  }
}));

// Disponibilidad de los turnos de retiro de la jornada comercial en curso (ver orders/slots.ts).
// Pública: la consume tanto el checkout del cliente como los formularios de carga manual de
// recepción/cocina, ninguno de los cuales tiene por qué estar logueado para ver esto.
ordersRouter.get("/slots", asyncHandler(async (_req, res) => {
  res.json(await getSlotAvailability());
}));

// Busca un único pedido por su número visible o por teléfono. Pública (la usa el
// cliente para seguimiento) — a diferencia de GET "/", nunca devuelve el listado completo,
// así que no expone nombre/teléfono del resto de los clientes.
ordersRouter.get("/lookup", asyncHandler(async (req, res) => {
  const { orderNumber, phone } = req.query;
  if (typeof orderNumber !== "string" && typeof phone !== "string") {
    res.status(400).json({ error: 'Falta el parámetro "orderNumber" o "phone"' });
    return;
  }
  const order = await lookupOrder({
    orderNumber: typeof orderNumber === "string" ? orderNumber : undefined,
    phone: typeof phone === "string" ? phone : undefined,
  });
  if (!order) {
    res.status(404).json({ error: "No encontramos ningún pedido con ese dato" });
    return;
  }
  res.json(order);
}));

// Devuelve los pedidos, más nuevo primero. Solo staff: expone nombre y teléfono de todos
// los clientes, no puede ser público. Recepción y admin solo ven la jornada comercial en
// curso (el dashboard de admin es "hoy", no el histórico) — cocina sigue recibiendo todos
// los pedidos, que es lo que sus propias pantallas necesitan.
const ROLES_LIMITED_TO_TODAY = new Set(["recepcionista", "admin"]);
ordersRouter.get("/", requireAuth, requireRole("recepcionista", "cocina", "admin"), asyncHandler(async (req, res) => {
  const onlyCurrentBusinessDay = ROLES_LIMITED_TO_TODAY.has(req.user!.rol);
  res.json(await listOrders({ onlyCurrentBusinessDay }));
}));

// Actualiza el estado y/o horario de un pedido existente. Solo staff.
ordersRouter.patch("/:id", requireAuth, requireRole("recepcionista", "cocina", "admin"), async (req, res) => {
  try {
    const order = await updateOrder(req.params.id, req.body as UpdateOrderInput);
    res.json(order);
  } catch (err) {
    if (err instanceof OrderNotFoundError) {
      res.status(404).json({ error: err.message });
      return;
    }
    if (err instanceof SlotFullError) {
      res.status(409).json({ error: err.message });
      return;
    }
    if (err instanceof InvalidSlotError) {
      res.status(400).json({ error: err.message });
      return;
    }
    res.status(500).json({ error: err instanceof Error ? err.message : "Error desconocido al actualizar el pedido" });
  }
});
