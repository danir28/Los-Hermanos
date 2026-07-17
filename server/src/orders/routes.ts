import { Router } from "express";
import { createOrder, listOrders, updateOrder, OrderNotFoundError } from "./service.js";
import type { CreateOrderInput, UpdateOrderInput } from "./types.js";

export const ordersRouter = Router();

// Crea un pedido nuevo a partir de cliente, teléfono, ítems y canal de origen.
ordersRouter.post("/", async (req, res) => {
  const body = req.body as Partial<CreateOrderInput>;
  if (!body.customer || !body.phone || !body.type || !Array.isArray(body.items) || body.items.length === 0) {
    res.status(400).json({ error: 'Faltan datos del pedido ("customer", "phone", "type", "items")' });
    return;
  }
  const order = await createOrder(body as CreateOrderInput);
  res.json(order);
});

// Devuelve todos los pedidos, más nuevo primero.
ordersRouter.get("/", async (_req, res) => {
  res.json(await listOrders());
});

// Actualiza el estado y/o horario de un pedido existente.
ordersRouter.patch("/:id", async (req, res) => {
  try {
    const order = await updateOrder(req.params.id, req.body as UpdateOrderInput);
    res.json(order);
  } catch (err) {
    if (err instanceof OrderNotFoundError) {
      res.status(404).json({ error: err.message });
      return;
    }
    res.status(500).json({ error: err instanceof Error ? err.message : "Error desconocido al actualizar el pedido" });
  }
});
