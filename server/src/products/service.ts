import { db } from "../db.js";
import type { Product } from "../generated/prisma/client.js";
import type { CreateProductInput, ProductDTO, UpdateProductInput } from "./types.js";

export class ProductNotFoundError extends Error {
  constructor(id: number) {
    super(`No existe el producto #${id}`);
    this.name = "ProductNotFoundError";
  }
}

function toDTO(product: Product): ProductDTO {
  return {
    id: product.id,
    name: product.name,
    category: product.category,
    price: Number(product.price),
    description: product.description,
    image: product.image,
    featured: product.featured,
    active: product.active,
    outOfStock: product.outOfStock,
  };
}

// Todo el catálogo, ordenado por id (= orden de carga original) — tanto la app de cliente como
// recepción/cocina filtran active/outOfStock del lado del frontend, igual que ya hacían con el
// array hardcodeado; admin necesita ver también los inactivos para poder reactivarlos. El orden
// por id hace que las categorías, al derivarse en el frontend por primera aparición (ver
// src/app/lib/useProducts.ts), conserven el agrupamiento curado con el que se cargó el catálogo
// real la primera vez.
export async function listProducts(): Promise<ProductDTO[]> {
  const products = await db.product.findMany({ orderBy: { id: "asc" } });
  return products.map(toDTO);
}

export async function createProduct(input: CreateProductInput): Promise<ProductDTO> {
  const product = await db.product.create({ data: input });
  return toDTO(product);
}

export async function updateProduct(id: number, patch: UpdateProductInput): Promise<ProductDTO> {
  const existing = await db.product.findUnique({ where: { id } });
  if (!existing) throw new ProductNotFoundError(id);
  const product = await db.product.update({ where: { id }, data: patch });
  return toDTO(product);
}

// Borrado real (no soft-delete): OrderItem guarda name/qty/price como una foto del momento de
// la compra, independiente del Product — borrar un producto de acá no rompe pedidos ya hechos.
// Para discontinuar un producto sin perder el historial de referencia, usar
// updateProduct(id, { active: false }) en vez de esto.
export async function deleteProduct(id: number): Promise<void> {
  const existing = await db.product.findUnique({ where: { id } });
  if (!existing) throw new ProductNotFoundError(id);
  await db.product.delete({ where: { id } });
}
