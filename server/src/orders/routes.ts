import { Router } from "express";
import { requireAuth, requireRole } from "../auth/middleware.js";
import { asyncHandler } from "../lib/asyncHandler.js";
import { notifyKitchenNewOrder } from "../push/service.js";
import { createOrder, deleteOrder, getSlotAvailability, listOrders, lookupOrder, updateOrder, BusinessClosedError, OrderNotFoundError } from "./service.js";
import { InvalidSlotError, SlotFullError } from "./slots.js";
import type { CreateOrderInput, UpdateOrderInput } from "./types.js";

export const ordersRouter = Router();

// Crea un pedido nuevo a partir de cliente, teléfono, ítems y canal de origen. Pública:
// la usan tanto el cliente (checkout) como recepción (alta manual presencial/telefónica).
ordersRouter.post("/", asyncHandler(async (req, res) => {
  const body = req.body as Partial<CreateOrderInput>;
  if (!body.customer || !body.phone || !body.type || !body.estimatedTime || !Array.isArray(body.items) || body.items.length === 0) {
    res.status(400).json({ error: 'Faltan datos del pedido ("customer", "phone", "type", "estimatedTime", "items")' });
    return;
  }
  try {
    const order = await createOrder(body as CreateOrderInput);
    // Fire-and-forget: un fallo al avisarle a cocina (VAPID sin configurar, suscripción
    // vencida, etc.) nunca debe impedir que el pedido se haya creado ya con éxito.
    notifyKitchenNewOrder(order).catch(err => console.error("No se pudo notificar a cocina:", err));
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

// Devuelve los pedidos, más nuevo primero. Solo staff: expone nombre y teléfono de todos los
// clientes, no puede ser público. Los tres roles ven solo la jornada comercial en curso —
// cocina se sumó a esta restricción cuando el Panel pasó a mostrar "todos los pedidos del día"
// ordenados por horario de retiro (antes recibía el histórico completo porque el viejo Panel
// y el Tablero necesitaban ver pedidos de cualquier día).
const ROLES_LIMITED_TO_TODAY = new Set(["recepcionista", "cocina", "admin"]);
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

// Borra un pedido de forma permanente — pensado para limpiar pedidos de prueba antes de que el
// cliente empiece a operar de verdad (ver deleteOrder en service.ts). Solo-admin: ni recepción
// ni cocina pueden borrar pedidos, a diferencia del PATCH de arriba que los tres roles usan.
ordersRouter.delete("/:id", requireAuth, requireRole("admin"), asyncHandler(async (req, res) => {
  try {
    await deleteOrder(req.params.id);
    res.json({ ok: true });
  } catch (err) {
    if (err instanceof OrderNotFoundError) {
      res.status(404).json({ error: err.message });
      return;
    }
    throw err;
  }
}));
