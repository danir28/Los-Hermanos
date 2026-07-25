import { Router } from "express";
import { requireAuth, requireRole } from "../auth/middleware.js";
import { asyncHandler } from "../lib/asyncHandler.js";
import { createProduct, deleteProduct, listProducts, updateProduct, ProductNotFoundError } from "./service.js";
import type { CreateProductInput, UpdateProductInput } from "./types.js";

export const productsRouter = Router();

// Catálogo completo, público: lo usan tanto la app de cliente (menú, carta QR de mostrador)
// como la carga manual de recepción/cocina — todas filtran active/outOfStock del lado del
// frontend, así que no hace falta un query param para eso acá.
productsRouter.get("/", asyncHandler(async (_req, res) => {
  res.json(await listProducts());
}));

const REQUIRED_FIELDS = ["name", "category", "price", "description", "image"] as const;

// Alta de un producto nuevo. Solo-admin: es quien carga el catálogo ahora que no hay FUDO
// conectado a este sistema (ver memoria de proyecto sobre la reunión del 24/7/2026).
productsRouter.post("/", requireAuth, requireRole("admin"), asyncHandler(async (req, res) => {
  const body = req.body as Partial<CreateProductInput>;
  const missing = REQUIRED_FIELDS.filter(f => body[f] === undefined || body[f] === "");
  if (missing.length) {
    res.status(400).json({ error: `Faltan datos del producto: ${missing.join(", ")}` });
    return;
  }
  const product = await createProduct({
    name: body.name!,
    category: body.category!,
    price: body.price!,
    description: body.description!,
    image: body.image!,
    featured: body.featured ?? false,
    active: body.active ?? true,
    outOfStock: body.outOfStock ?? false,
  });
  res.json(product);
}));

// Edita cualquier subconjunto de campos de un producto existente (ej. solo el precio). Solo-admin.
productsRouter.patch("/:id", requireAuth, requireRole("admin"), asyncHandler(async (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id)) {
    res.status(400).json({ error: "Id de producto inválido" });
    return;
  }
  try {
    res.json(await updateProduct(id, req.body as UpdateProductInput));
  } catch (err) {
    if (err instanceof ProductNotFoundError) {
      res.status(404).json({ error: err.message });
      return;
    }
    throw err;
  }
}));

// Borra un producto por completo (no soft-delete, ver deleteProduct en service.ts). Solo-admin.
productsRouter.delete("/:id", requireAuth, requireRole("admin"), asyncHandler(async (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id)) {
    res.status(400).json({ error: "Id de producto inválido" });
    return;
  }
  try {
    await deleteProduct(id);
    res.json({ ok: true });
  } catch (err) {
    if (err instanceof ProductNotFoundError) {
      res.status(404).json({ error: err.message });
      return;
    }
    throw err;
  }
}));
