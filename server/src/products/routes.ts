import { Router } from "express";
import { requireAuth, requireRole } from "../auth/middleware.js";
import { asyncHandler } from "../lib/asyncHandler.js";
import {
  addProductImage,
  createProduct,
  deleteProduct,
  deleteProductImage,
  listProducts,
  ProductImageNotFoundError,
  ProductNotFoundError,
  replaceOptionGroups,
  reorderProductImages,
  updateProduct,
} from "./service.js";
import { isSelectionType, SELECTION_TYPES } from "./types.js";
import type { CreateOptionGroupInput, CreateProductInput, UpdateProductInput } from "./types.js";
import { productImageUpload } from "./uploads.js";

export const productsRouter = Router();

// Catálogo completo, público: lo usan tanto la app de cliente (menú, carta QR de mostrador)
// como la carga manual de recepción/cocina — todas filtran active/outOfStock del lado del
// frontend, así que no hace falta un query param para eso acá.
productsRouter.get("/", asyncHandler(async (_req, res) => {
  res.json(await listProducts());
}));

const REQUIRED_FIELDS = ["name", "category", "price", "description"] as const;

// Alta de un producto nuevo. Solo-admin: es quien carga el catálogo ahora que no hay FUDO
// conectado a este sistema (ver memoria de proyecto sobre la reunión del 24/7/2026). Nace sin
// fotos ni opciones — se cargan después con los endpoints de abajo, una vez que el producto
// tiene id.
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
    featured: body.featured ?? false,
    active: body.active ?? true,
    outOfStock: body.outOfStock ?? false,
    offerAsOption: body.offerAsOption ?? false,
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

// Sube una foto nueva al carrusel del producto (multipart/form-data, campo "image"). Solo-admin.
productsRouter.post("/:id/images", requireAuth, requireRole("admin"), productImageUpload.single("image"), asyncHandler(async (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id)) {
    res.status(400).json({ error: "Id de producto inválido" });
    return;
  }
  if (!req.file) {
    res.status(400).json({ error: "Falta el archivo de imagen" });
    return;
  }
  try {
    const url = `/uploads/products/${req.file.filename}`;
    res.json(await addProductImage(id, url));
  } catch (err) {
    if (err instanceof ProductNotFoundError) {
      res.status(404).json({ error: err.message });
      return;
    }
    throw err;
  }
}));

// Borra una foto puntual del carrusel. Solo-admin.
productsRouter.delete("/:id/images/:imageId", requireAuth, requireRole("admin"), asyncHandler(async (req, res) => {
  const id = Number(req.params.id);
  const imageId = Number(req.params.imageId);
  if (!Number.isInteger(id) || !Number.isInteger(imageId)) {
    res.status(400).json({ error: "Id inválido" });
    return;
  }
  try {
    res.json(await deleteProductImage(id, imageId));
  } catch (err) {
    if (err instanceof ProductNotFoundError || err instanceof ProductImageNotFoundError) {
      res.status(404).json({ error: err.message });
      return;
    }
    throw err;
  }
}));

// Reordena el carrusel: body { orderedIds: number[] } con TODOS los ids de imagen del producto
// en el orden final deseado. Solo-admin.
productsRouter.patch("/:id/images/reorder", requireAuth, requireRole("admin"), asyncHandler(async (req, res) => {
  const id = Number(req.params.id);
  const orderedIds = (req.body as { orderedIds?: unknown }).orderedIds;
  if (!Number.isInteger(id) || !Array.isArray(orderedIds) || !orderedIds.every(v => Number.isInteger(v))) {
    res.status(400).json({ error: "Body inválido: se espera { orderedIds: number[] }" });
    return;
  }
  try {
    res.json(await reorderProductImages(id, orderedIds as number[]));
  } catch (err) {
    if (err instanceof ProductNotFoundError) {
      res.status(404).json({ error: err.message });
      return;
    }
    if (err instanceof Error) {
      res.status(400).json({ error: err.message });
      return;
    }
    throw err;
  }
}));

// Valida el body de PUT /:id/option-groups: array de grupos, cada uno con su tipo de selección
// válido y sus opciones anidadas. quantityTarget es obligatorio (>0) para selectionType
// "quantity" y se ignora (se guarda null) para los otros dos tipos. sourceCategory (opcional) es
// null/ausente para un grupo manual, o un string no vacío para un grupo dinámico (ver
// ProductOptionGroup.sourceCategory en schema.prisma) — en ese caso `options` significa otra
// cosa distinta: en vez de la lista completa de opciones (que se calcula sola desde el catálogo),
// son overrides puntuales de precio para algún producto de esa categoría (ver
// ProductOption.sourceProductId), cada uno con sourceProductId obligatorio; defaultPriceDelta es
// el precio de cualquier opción SIN override. Para un grupo manual, defaultPriceDelta se ignora
// (se guarda 0) y cada opción sigue siendo {name, priceDelta} sin sourceProductId.
function parseOptionGroups(body: unknown): CreateOptionGroupInput[] | null {
  if (!Array.isArray(body)) return null;
  const groups: CreateOptionGroupInput[] = [];
  for (const raw of body) {
    if (typeof raw !== "object" || raw === null) return null;
    const g = raw as Record<string, unknown>;
    if (typeof g.name !== "string" || !g.name.trim()) return null;
    if (!isSelectionType(g.selectionType)) return null;
    if (!Array.isArray(g.options)) return null;
    if (g.selectionType === "quantity" && !(Number.isInteger(g.quantityTarget) && (g.quantityTarget as number) > 0)) return null;

    let sourceCategory: string | null = null;
    if (g.sourceCategory !== undefined && g.sourceCategory !== null) {
      if (typeof g.sourceCategory !== "string" || !g.sourceCategory.trim()) return null;
      sourceCategory = g.sourceCategory.trim();
    }

    let defaultPriceDelta = 0;
    if (sourceCategory !== null) {
      if (g.defaultPriceDelta === undefined) {
        defaultPriceDelta = 0;
      } else if (typeof g.defaultPriceDelta !== "number" || !Number.isFinite(g.defaultPriceDelta)) {
        return null;
      } else {
        defaultPriceDelta = g.defaultPriceDelta;
      }
    }

    const options = [];
    for (const rawOpt of g.options) {
      if (typeof rawOpt !== "object" || rawOpt === null) return null;
      const o = rawOpt as Record<string, unknown>;
      if (typeof o.name !== "string" || !o.name.trim()) return null;
      if (typeof o.priceDelta !== "number" || !Number.isFinite(o.priceDelta)) return null;
      if (sourceCategory !== null) {
        // Override de un grupo dinámico: tiene que apuntar a un producto puntual.
        if (!Number.isInteger(o.sourceProductId)) return null;
        options.push({ name: o.name.trim(), priceDelta: o.priceDelta, sortOrder: options.length, sourceProductId: o.sourceProductId as number });
      } else {
        // Opción tipeada a mano de un grupo manual: nunca referencia otro producto.
        options.push({ name: o.name.trim(), priceDelta: o.priceDelta, sortOrder: options.length, sourceProductId: null });
      }
    }

    groups.push({
      name: g.name.trim(),
      selectionType: g.selectionType,
      required: Boolean(g.required),
      quantityTarget: g.selectionType === "quantity" ? (g.quantityTarget as number) : null,
      sourceCategory,
      defaultPriceDelta,
      sortOrder: groups.length,
      options,
    });
  }
  return groups;
}

// Reemplaza el set completo de grupos de opciones de un producto (ej. "Sabor", "Agregados").
// Solo-admin. Ver replaceOptionGroups en service.ts para el porqué del reemplazo completo en
// vez de edición incremental.
productsRouter.put("/:id/option-groups", requireAuth, requireRole("admin"), asyncHandler(async (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id)) {
    res.status(400).json({ error: "Id de producto inválido" });
    return;
  }
  const groups = parseOptionGroups(req.body);
  if (!groups) {
    res.status(400).json({ error: `Body inválido: se espera un array de grupos con selectionType en ${SELECTION_TYPES.join("|")}` });
    return;
  }
  try {
    res.json(await replaceOptionGroups(id, groups));
  } catch (err) {
    if (err instanceof ProductNotFoundError) {
      res.status(404).json({ error: err.message });
      return;
    }
    throw err;
  }
}));
